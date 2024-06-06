/*
Handle the user set game source preferences and provide practical functions for working with them.
*/

import { ObjectDistributionType, ObjectDistributionTypeToAPIObjectType, ObjectPoolByDistributionType } from "./distributiontype";
import { ObjectIdentifierToInstalledObject } from "./objectlist";
import { getDynamicStore } from "./sharedstorage";
import { log } from "./util/log";

export type SourcePreference = Record<ObjectSourceGame, number>;
export type AllowedGameSources = Record<ObjectSourceGame, boolean>;
// TS can't extract the literals from a union of string literals, which I think means this is the only choice to iterate over them - besides iterating over every object
// and building the list dynamically that way instead
export const GameSourcesArray: ObjectSourceGame[] = ["rct1", "added_attractions", "loopy_landscapes", "rct2", "wacky_worlds", "time_twister", "custom", "openrct2_official"] as const;

const sourcePreferenceKeys = ["global", "ride", "footpath_surface", "footpath_railings", "park_entrance"] as const;
export type SourcePreferenceKey = typeof sourcePreferenceKeys[number];

var SavedSourcePreferences: Partial<Record<ObjectType | "global", SourcePreference>> = {};

export function clearSourcePreferences()
{
    SavedSourcePreferences = {};
    return true;
}

export function calculateAllSourcePreferences()
{
    for (const key of sourcePreferenceKeys)
    {
        getSourcePreferenceForObjectType(key);
    }
    return true;
}

function getSourcePreferenceForObjectType(objType: SourcePreferenceKey)
{
    let saved = SavedSourcePreferences[objType];
    if (saved !== undefined)
    {
        return saved;
    }
    // Build from stores and save
    let dropdownIndex = getDynamicStore(objType+"SourcePreferenceDropdown", 0).get();
    // Global is missing the "use global setting" option, which is normally index 0
    if (objType === "global")
    {
        dropdownIndex++;
    }
    let retval: SourcePreference;
    if (dropdownIndex == 0) // Use global setting
    {
        retval = getSourcePreferenceForObjectType("global");
    }
    else if (dropdownIndex == 1) // Copy scenario's existing
    {
        retval = getScenarioExistingSourcePreference(objType);
    }
    else if (dropdownIndex == 2) // Use manual override
    {
        let temp: Partial<SourcePreference> = {};
        for (const game of GameSourcesArray)
        {
            let gameWeight = getDynamicStore(objType+"SourcePreferenceWeight"+game, 100).get();
            temp[game] = gameWeight;
        }
        retval = temp as SourcePreference;
    }
    else
    {
        log(`No handling for source preference selection ${dropdownIndex}, revert to global`, "error");
        retval = getSourcePreferenceForObjectType("global");
    }
    log(`Source preference for ${objType}: ${JSON.stringify(retval)}`, "info");
    SavedSourcePreferences[objType] = retval;
    return retval;
}

function getScenarioExistingSourcePreference(objType: SourcePreferenceKey)
{
    let items: LoadedObject[] = [];
    let objTypes: ObjectType[] = [];
    if (objType == "global")
    {
        objTypes = ["ride", "footpath_surface", "footpath_addition", "footpath_railings", "park_entrance"];
    }
    else
    {
        objTypes = [objType];
    }
    for (const thisObjType of objTypes)
    {
        items = items.concat(objectManager.getAllObjects(thisObjType));
    }
    let countsByGame: Partial<Record<ObjectSourceGame, number>> = {};
    for (const loadedObj of items)
    {
        // A lot of rct1 objects are flagged with rct2 as an appearance game, counting only the "earliest"
        // should give better results more like the original scenario, especially for rct1 items
        let minGame: undefined | ObjectSourceGame = undefined;
        for (const loadedObjGame of loadedObj.installedObject.sourceGames)
        {
            if (minGame === undefined || GameSourcesArray.indexOf(loadedObjGame) < GameSourcesArray.indexOf(minGame))
            {
                minGame = loadedObjGame;
            }
        }
        if (minGame !== undefined)
        {
            let newCount = (countsByGame[minGame] ?? 0) + 1;
            countsByGame[minGame] = newCount;
        }
    }
    log(`Existing source weights for type ${objType} after ${items.length} objects: ${JSON.stringify(countsByGame)}`, "sourcepreference");
    // Considering this is a probability to accept things on the list, it's going to be a guess.
    // TODO consider doing the awful job of calculating what these values "should" (considering pool sizes) really be rather than this very rough approximation
    let highestCount = 1;
    for (const key of Object.keys(countsByGame))
    {
        highestCount = Math.max(highestCount, countsByGame[key as ObjectSourceGame] ?? 0);
    }
    for (const key of GameSourcesArray)
    {
        if (countsByGame[key] == undefined)
        {
            countsByGame[key] = 0;
        }
    }
    let returnVal = countsByGame as SourcePreference;
    for (const key of Object.keys(returnVal))
    {
        let keySourceGame = key as ObjectSourceGame;
        returnVal[keySourceGame] = Math.round(100*returnVal[keySourceGame]/highestCount);
    }
    
    return returnVal;
}

/**
 * Find all objects of the given type that exist with the given source games.
 * @param {ObjectType} objtype
 * @param {AllowedGameSources} gamesources
 * @return {*} An array of string identifiers.
 */
function getAvailableObjects(objtype: ObjectDistributionType, gamesources: AllowedGameSources)
{  
    let objectPool = ObjectPoolByDistributionType[objtype];
    return objectPool.filter((ident: string) =>
    {
        let obj = ObjectIdentifierToInstalledObject[ident];
        if (obj === undefined)
        {
            log(`Couldn't get an InstalledObject for ${ident}, it's been destroyed somehow?`, "warning");
            return false;
        }
        for (const game of obj.sourceGames)
        {
            if (gamesources[game])
            {
                return true;
            }
        }
        return false;
    });
}

/**
 * Return the number of objects of a given type that a SourcePreference could possibly call valid.
 * @param {SourcePreference} pref
 * @param {ObjectType} objType
 */
function getNumberOfObjectsAllowedByPreference(objType: ObjectDistributionType, pref: SourcePreference)
{
    return getAvailableObjects(objType, getAllowedGameSources(pref, true)).length;
}

/**
 * Roll the probabilities of each source game in SourcePreference, returning an AllowedGameSources containing those allowed this time.
 * @export
 * @param {SourcePreference} pref
 * @param {false} mostpermissible If true, any probability > 0 is treated as if it had a 100% chance of success.
 * @return {*} 
 */
function getAllowedGameSources(pref: SourcePreference, mostpermissible=false): AllowedGameSources
{
    let obj: Record<string, boolean> = {};
    for (const key in pref)
    {
        // No Object.entries yet :(
        let prob = (pref as {[key: string]: number})[key];
        let val = false;
        if (prob > 0)
        {
            if (mostpermissible || context.getRandom(0, 100) < prob)
            {
                val = true;
            }
        }
        obj[key] = val;
    }
    return obj as AllowedGameSources;
}

export function pickRandomIdentifierRespectingSourcePreferences(objType: ObjectDistributionType)
{
    let apiObjectType = ObjectDistributionTypeToAPIObjectType[objType];
    let objectPool = ObjectPoolByDistributionType[objType];
    if (sourcePreferenceKeys.indexOf(apiObjectType as SourcePreferenceKey) <= -1)
    {
        // There's no source preference for this distribution type, so we just let it go full random
        let pickedIdentifier = objectPool[context.getRandom(0, objectPool.length)];
        return pickedIdentifier;
    }
    // We handled the case where it wasn't found in the const array, so this type force should always be valid
    let sourcePref = getSourcePreferenceForObjectType(apiObjectType as SourcePreferenceKey);
    // Make sure that being restrictive can get us something
    if (getNumberOfObjectsAllowedByPreference(objType, sourcePref) == 0)
    {
        log(`No items allowed of ${objType} with pref ${JSON.stringify(sourcePref)}, going random`, "sourcepreference");
        // Also have to go full random?
        let pickedIdentifier = objectPool[context.getRandom(0, objectPool.length)];
        return pickedIdentifier;
    }
    // In theory this should always complete, but locking up the game indefinitely is not good if I'm wrong
    for (let i=0; i<2000; i++)
    {
        let allowedSources = getAllowedGameSources(sourcePref);
        let subPool = getAvailableObjects(objType, allowedSources);
        if (subPool.length > 0)
        {
            let pickedIdentifier = subPool[context.getRandom(0, subPool.length)];
            return pickedIdentifier;
        }
    }
    let pickedIdentifier = objectPool[context.getRandom(0, objectPool.length)];
    return pickedIdentifier;
}