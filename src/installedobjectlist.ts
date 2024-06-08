/*
    Maintain various lists of available objects that are needed for everything else to stand a chance of working.
*/
export const SupportedObjectTypes = ["ride", "footpath_addition", "footpath_surface", "footpath_railings", "park_entrance"] as const;
export type SupportedObjectType = typeof SupportedObjectTypes[number];


// objectManager.getInstalledObject does not function - see https://github.com/OpenRCT2/OpenRCT2/issues/21448
// For now I will maintain my own map of this, should not be too hard to clean up if/when implemented in the engine
export let ObjectIdentifierToInstalledObject: Record<string, InstalledObject> = {}

let listAvailableObjectsWorkingList: InstalledObject[] = [];

const MAX_ITERATIONS = 1000;

// Something is VERY weird about InstalledObjects. Those retrieved from objectManager.installedObjects seem abnormal
// JSON.stringify fails on them (returns {})
// I'm also frequently having crashes when doing operations reading from things involving ObjectIdentifierToInstalledObject
// or when trying to clear ObjectIdentifierToInstalledObject itself at the end of a run
// which makes me think that some things in here are somehow retaining references to the original (which presumably might get freed when I load/unload objectgs),
// and Object.create(InstalledObject) doesn't get rid of them
// This looks awful, but it fixes my mystery crashes, and JSON.stringify works properly on what it outputs.
// The crashes are straight CTD without backtrace or dumps.
function makeCopyOfInstalledObject(template: InstalledObject): InstalledObject
{
    let newObj: Partial<Record<keyof InstalledObject, any>> = {};
    newObj["path"] = `${template["path"]}`;
    newObj["generation"] = `${template["generation"]}`;
    newObj["type"] = `${template["type"]}`;
    newObj["sourceGames"] = [];
    for (const sourceGame of template["sourceGames"])
    {
        newObj["sourceGames"].push(`${sourceGame}`);
    }
    newObj["identifier"] = `${template["identifier"]}`;
    // could be null, but I don't use this anyway
    newObj["legacyIdentifier"] = `${template["legacyIdentifier"]}`;
    newObj["version"] = `${template["version"]}`;
    newObj["name"] = `${template["name"]}`;
    newObj["authors"] = [];
    for (const author of template["authors"])
    {
        newObj["authors"].push(`${author}`);
    }
    return newObj as InstalledObject;
}

export function listAvailableObjects()
{
    if (listAvailableObjectsWorkingList.length == 0)
    {
        clearAvailableObjects();
        listAvailableObjectsWorkingList = objectManager.installedObjects.filter((obj: InstalledObject) => {
            return SupportedObjectTypes.indexOf(obj.type as SupportedObjectType) > -1;
        });
    }
    let listForThisIteration = listAvailableObjectsWorkingList.splice(0, MAX_ITERATIONS);
    for (const obj of listForThisIteration)
    {
        let newKey = `${obj.identifier}`;
        // Causes crashes, especially if you try to randomise twice without reloading the plugin
        //ObjectIdentifierToInstalledObject[newKey] = Object.create(obj)
        ObjectIdentifierToInstalledObject[newKey] = makeCopyOfInstalledObject(obj);
    }
    if (listAvailableObjectsWorkingList.length == 0)
    {
        return true;
    }
    return false;
}

export function clearAvailableObjects()
{
    ObjectIdentifierToInstalledObject = {};
    return true;
}