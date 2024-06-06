/*
    Maintain various lists of available objects that are needed for everything else to stand a chance of working.
*/

import { ObjectAssociations } from "./objectassociation";

export const SupportedObjectTypes = ["ride", "footpath_addition", "footpath_surface", "footpath_railings", "park_entrance"] as const;
export type SupportedObjectType = typeof SupportedObjectTypes[number];


// objectManager.getInstalledObject does not function - see https://github.com/OpenRCT2/OpenRCT2/issues/21448
// For now I will maintain my own map of this, should not be too hard to clean up if/when implemented in the engine
export const ObjectIdentifierToInstalledObject: Record<string, InstalledObject> = {}

let listAvailableObjectsWorkingList: InstalledObject[] = [];

const MAX_ITERATIONS = 1000;



export function listAvailableObjects()
{
    if (listAvailableObjectsWorkingList.length == 0)
    {
        listAvailableObjectsWorkingList = objectManager.installedObjects.filter((obj: InstalledObject) => {
            return SupportedObjectTypes.indexOf(obj.type as SupportedObjectType) > -1;
        });
    }
    clearAvailableObjects();
    let listForThisIteration = listAvailableObjectsWorkingList.splice(0, MAX_ITERATIONS);
    for (const obj of listForThisIteration)
    {
        let association = ObjectAssociations[obj.identifier];
        if (association === undefined || !association.blacklisted)
        {
            // This is seemingly the closest I can get to a deepcopy without a polyfill
            // A shallow copy is not enough, because InstalledObject.sourceGames remains a reference to the original
            // ... which is destroyed for objects that are initially loaded the moment we unload them
            //ObjectIdentifierToInstalledObject[obj.identifier] = JSON.parse(JSON.stringify(obj));
            ObjectIdentifierToInstalledObject[obj.identifier] = Object.create(obj);
        }
    }
    if (listAvailableObjectsWorkingList.length == 0)
    {
        return true;
    }
    return false;
}

export function clearAvailableObjects()
{
    for (const key in Object.keys(ObjectIdentifierToInstalledObject))
    {
        delete ObjectIdentifierToInstalledObject[key];
    }
    return true;
}