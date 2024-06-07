const JUMPING_FOUNTAIN_IDENTIFIER = "rct2.footpath_item.jumpfnt1";
const JUMPING_SNOWBALL_IDENTIFIER = "rct2.footpath_item.jumpsnw1";
const QUEUE_LINE_TV_IDENTIFIER = "rct2.footpath_item.qtv1";
const CASH_MACHINE_IDENTIFIER = "rct2.ride.atm1";

import { NonRideObjectDistributionType, ObjectDistributionType, ObjectDistributionTypeToAPIObjectType, ObjectPoolByDistributionType, RideObjectDistributionType, getDistributionTypeForObject } from "./distributiontype";
import { forbiddenIndexes, indexesPresentInWorld, preferentialIndexQueue } from "./forbiddenindexes";
import { NonRideObjectsRequired, RideObjectsRequired, remainingItems } from "./numberofobjects";
import { ObjectIdentifierToInstalledObject, SupportedObjectType, SupportedObjectTypes } from "./objectlist";
import { log } from "./util/log";
import { StringTable, formatTokens } from "./util/strings";
import { setErrorState } from "./util/errorhandler";
import { pickRandomIdentifierRespectingSourcePreferences } from "./sourcepreference";
import { ObjectAssociations } from "./objectassociation";

const MAX_LOADS_PER_TICK = 2;

function tryToLoadObject(identifier: string, index: number | undefined)
{
    log(`Trying to load ${identifier} at index ${index}...`, "allLoads");
    if (identifier === undefined)
    {
        log(`Tried to load an undefined identifier, probably means we ran out of objects.`, "warning");
        return true;
    }
    // Whatever object we are about to try to squish gets (re)added to the object pool
    let apiObjectType = ObjectIdentifierToInstalledObject[identifier].type;
    if (index !== undefined)
    {
        let existingObject = objectManager.getObject(apiObjectType, index);
        if (existingObject !== null)
        {
            let existingDistributionType = getDistributionTypeForObject(existingObject.installedObject);
            if (existingDistributionType !== null)            
            {
                ObjectPoolByDistributionType[existingDistributionType].push(existingObject.identifier);
                log(`Index ${index} contained ${existingObject.identifier}, returned to pool`, "allLoads");
            }
        }
        else
        {
            //log(`Index ${index} contained a null, continue trying to squish it`, "allLoads");
        }
    }
    let loadReturn = objectManager.load(identifier, index);
    if (loadReturn == null)
    {
        log(`Attempting to load ${identifier} into ${apiObjectType} ${index} failed (null return)`, "error");
        setErrorState(formatTokens(StringTable.ERROR_LOAD_FAILED_NULL_RETURN, apiObjectType));
        return false;
    }
    // If you have the object selection window open, objectManager.load returns but fails
    // So we want to try to read it back to make sure it went through
    if (objectManager.getObject(apiObjectType, loadReturn.index).identifier != identifier)
    {
        log(`Attempting to load ${identifier} into ${apiObjectType} ${index} failed (didn't take, likely object selection window is open)`, "error");
        setErrorState(StringTable.ERROR_LOAD_FAILED_OBJECT_SELECTION_OPEN);
        return false;
    }
    if (index !== undefined && index !== loadReturn.index)
    {
        // A quick look through the c++ shows:
        // objectManager.load will try to unload the thing normally occupying that index BEFORE trying to load into it
        // ... but this LEAVES A NULL IN THAT SLOT which is awful if there are things in the park using that slot
        // ... and then on the next attempt it's quite happy to try loading a different object in there, and this kept causing me unexpected path -> queue conversions
        log(`Tried to load ${identifier} into index ${index}, but loader put it in ${loadReturn.index} instead`, "warning");
        objectManager.unload(apiObjectType, loadReturn.index);
        return tryToLoadObject(identifier, index);
    }
    let replacementDistributionType = getDistributionTypeForObject(ObjectIdentifierToInstalledObject[identifier]);
    if (replacementDistributionType !== null)
    {
        let indexOfLoadedItem = ObjectPoolByDistributionType[replacementDistributionType].indexOf(identifier);
        if (indexOfLoadedItem > -1)
        {
            ObjectPoolByDistributionType[replacementDistributionType].splice(indexOfLoadedItem, 1);
            //log(`Remove newly added ${identifier} from object pool, pool now ${ObjectPoolByDistributionType[replacementDistributionType]}`, "allLoads");
        }
    }
    forbiddenIndexes[apiObjectType as SupportedObjectType].push(loadReturn.index);
    handleAssociationsOnLoadingIdentifier(identifier);
    return true;
}

function canIndexBeUsed(distributionType: ObjectDistributionType, apiObjectType: ObjectType, trialIndex: number)
{
    let existingObjectAtThisIndex = objectManager.getObject(apiObjectType, trialIndex);
    if (existingObjectAtThisIndex == null)
    {
        return true;
    }
    let existingObjectDistributionType = getDistributionTypeForObject(existingObjectAtThisIndex.installedObject);
    // Limiting to same distribution type cuts out a lot of the hilarity of ride->ride replacements
    // but it also stops things like stalls and queue -> nonqueue from happening
    if (existingObjectDistributionType !== null && distributionType == existingObjectDistributionType)
    {
        return true;
    }

    return false;
}

function findIndexToLoadObjectOver(distributionType: ObjectDistributionType)
{
    let apiObjectType = ObjectDistributionTypeToAPIObjectType[distributionType];
    let trialIndex = 0;
    let supportedObjectType = apiObjectType as SupportedObjectType;
    for (const preferredIndex of preferentialIndexQueue[supportedObjectType])
    {
        if (canIndexBeUsed(distributionType, apiObjectType, preferredIndex))
        {
            preferentialIndexQueue[supportedObjectType].splice(preferentialIndexQueue[supportedObjectType].indexOf(preferredIndex), 1);
            return preferredIndex;
        }
    }
    let forbiddenForThisAPIType = forbiddenIndexes[supportedObjectType];
    while (true)
    {
        if (forbiddenForThisAPIType.indexOf(trialIndex) == -1)
        {
            if (canIndexBeUsed(distributionType, apiObjectType, trialIndex))
            {
                return trialIndex;
            }
        }
        trialIndex++;
    }
}

function loadRides(counts: RideObjectsRequired, invented: boolean)
{
    for (let run=0; run<MAX_LOADS_PER_TICK; run++)
    {
        let possibleTypes = Object.keys(counts).filter((key) => counts[key as RideObjectDistributionType] > 0);
        if (possibleTypes.length == 0)
        {
            return true;
        }
        let pickedDistributionType = possibleTypes[context.getRandom(0, possibleTypes.length)] as RideObjectDistributionType;
        let pickedIdentifier = pickRandomIdentifierRespectingSourcePreferences(pickedDistributionType);
        let targetIndex = undefined;
        if (invented)
        {
            targetIndex = findIndexToLoadObjectOver(pickedDistributionType);
        }
        if (!tryToLoadObject(pickedIdentifier, targetIndex))
        {
            return true;
        }
        counts[pickedDistributionType]--;
    }
    return false;
}

function loadNonRides(counts: NonRideObjectsRequired)
{
    for (let run=0; run<MAX_LOADS_PER_TICK; run++)
    {
        let possibleTypes = Object.keys(counts).filter((key) => counts[key as NonRideObjectDistributionType] > 0);
        if (possibleTypes.length == 0)
        {
            return true;
        }
        let pickedDistributionType = possibleTypes[context.getRandom(0, possibleTypes.length)] as NonRideObjectDistributionType;
        let pickedIdentifier = pickRandomIdentifierRespectingSourcePreferences(pickedDistributionType);
        let targetIndex = findIndexToLoadObjectOver(pickedDistributionType);
        if (!tryToLoadObject(pickedIdentifier, targetIndex))
        {
            return true;
        }
        counts[pickedDistributionType]--;
    }
    return false;
}

export function loadRandomObjects()
{
    if (remainingItems !== undefined)
    {
        if (!loadRides(remainingItems.invented, true)) { return false; }
        if (!loadRides(remainingItems.uninvented, false)) { return false; }
        if (!loadNonRides(remainingItems.nonResearcheable)) { return false; }
    }
    return true;
}

function removeCannotCoexistWithObjects(ident: string)
{
    let association = ObjectAssociations[ident];
    if (association != undefined)
    {
        for (const forbiddenIdent in association.cannotCoexistWith)
        {
            let forbiddenData = ObjectIdentifierToInstalledObject[forbiddenIdent];
            let forbiddenDistType = getDistributionTypeForObject(forbiddenData);
            if (forbiddenDistType !== null)
            {
                let indexOfForbiddenIdent = ObjectPoolByDistributionType[forbiddenDistType].indexOf(forbiddenIdent);
                if (indexOfForbiddenIdent > -1)
                {
                    ObjectPoolByDistributionType[forbiddenDistType].splice(indexOfForbiddenIdent, 1);
                    log(`Removed ${forbiddenIdent} from pool for ${forbiddenDistType}: is forbidden by object ${ident}`, "info");
                }
            }
        }
    }
}

function loadAlwaysComesWithObjects(ident: string)
{
    let association = ObjectAssociations[ident];
    if (association != undefined)
    {
        for (const alwaysComesWithIdent in association.alwaysComesWith)
        {
            let alwaysComesWithData = ObjectIdentifierToInstalledObject[alwaysComesWithIdent];
            let alwaysComesWithDistType = getDistributionTypeForObject(alwaysComesWithData);
            if (alwaysComesWithDistType !== null)
            {
                let indexOfAlwaysComesWithData = ObjectPoolByDistributionType[alwaysComesWithDistType].indexOf(alwaysComesWithIdent);
                if (indexOfAlwaysComesWithData > -1)
                {
                    let targetIndex = findIndexToLoadObjectOver(alwaysComesWithDistType);
                    log(`Try to load ${alwaysComesWithIdent} as a ${alwaysComesWithDistType}: ${ident} wants to always come with it, and it's not loaded yet`, "info");
                    tryToLoadObject(alwaysComesWithData.identifier, targetIndex);
                }
            }
        }
    }
}

function handleAssociationsOnLoadingIdentifier(identifier: string)
{
    removeCannotCoexistWithObjects(identifier);
    loadAlwaysComesWithObjects(identifier);
}

export function handleAssociationsForObjectsInPark()
{
    for (const objType of SupportedObjectTypes)
    {
        for (const index of indexesPresentInWorld[objType])
        {
            let obj = objectManager.getObject(objType, index);
            handleAssociationsOnLoadingIdentifier(obj.identifier);
        }
    }
    return true;
}