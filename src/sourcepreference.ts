import { AvailableObjects, ObjectIdentifierToStructure } from "./objectlist";

export type SourcePreference = Record<ObjectSourceGame, number>;
export type AllowedGameSources = Record<ObjectSourceGame, boolean>;
// TS can't extract the literals from a union of string literals, which I think means this is the only choice to iterate over them - besides iterating over every object
// and building the list dynamically that way instead
export const GameSourcesArray: ObjectSourceGame[] = ["rct1", "added_attractions", "loopy_landscapes", "rct2", "wacky_worlds", "time_twister", "custom", "openrct2_official"] as const;

var SavedSourcePreferences: Partial<Record<ObjectType, SourcePreference>> = {};

export function getSourcePreferenceForObjectType(objType: ObjectType)
{
    let saved = SavedSourcePreferences[objType];
    if (saved !== undefined)
    {
        return saved;
    }
    // TODO build from stores and save
}

/**
 * Find all objects of the given type that exist with the given source games.
 * @param {ObjectType} objtype
 * @param {AllowedGameSources} gamesources
 * @return {*} An array of string identifiers.
 */
export function getAvailableObjects(objtype: ObjectType, gamesources: AllowedGameSources)
{
    return AvailableObjects.filter((ident: string) =>
    {
        let obj = ObjectIdentifierToStructure[ident];
        if (obj.type == objtype)
        {
            for (const game of obj.sourceGames)
            {
                if (gamesources[game])
                {
                    return true;
                }
            }
        }
        return false;
    });
}

/**
 * Return the number of objects of a given type that a SourcePreference could possibly call valid.
 * @export
 * @param {SourcePreference} pref
 * @param {ObjectType} objtype
 */
export function getNumberOfObjectsAllowedByPreference(objtype: ObjectType, pref: SourcePreference)
{
    return getAvailableObjects(objtype, getAllowedGameSources(pref, true)).length;
}

/**
 * Roll the probabilities of each source game in SourcePreference, returning an AllowedGameSources containing those allowed this time.
 * @export
 * @param {SourcePreference} pref
 * @param {false} mostpermissible If true, any probability > 0 is treated as if it had a 100% chance of success.
 * @return {*} 
 */
export function getAllowedGameSources(pref: SourcePreference, mostpermissible=false): AllowedGameSources
{
    let obj: Record<string, boolean> = {};
    let foundNonzeroProbability = false;
    for (const key in pref)
    {
        // No Object.entries yet :(
        let prob = (pref as {[key: string]: number})[key];
        let val = false;
        if (prob > 0)
        {
            foundNonzeroProbability = true;
            if (mostpermissible || context.getRandom(0, 100) < prob)
            {
                val = true;
            }
        }
        obj[key] = val;
    }
    return obj as AllowedGameSources;
}