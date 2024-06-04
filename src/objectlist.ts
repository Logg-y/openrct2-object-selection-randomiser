import { ObjectAssociations } from "./objectassociation";

const SupportedObjectTypes = ["ride", "footpath_addition", "footpath_surface", "footpath_railings", "park_entrance"] as const;
type SupportedObjectType = typeof SupportedObjectTypes[number];


export const AvailableObjects: string[] = [];
// objectManager.getInstalledObject does not function - see https://github.com/OpenRCT2/OpenRCT2/issues/21448
// For now I will maintain my own map of this, should not be too hard to clean up if/when implemented in the engine
export const ObjectIdentifierToStructure: Record<string, InstalledObject> = {}

export function populateAvailableObjects()
{
    let longList = objectManager.installedObjects.filter((obj: InstalledObject) => {
        return SupportedObjectTypes.indexOf(obj.type as SupportedObjectType) > -1;
    });
    clearAvailableObjects();
    for (const obj of longList)
    {
        let association = ObjectAssociations[obj.identifier];
        if (association === undefined || !association.blacklisted)
        {
            AvailableObjects.push(obj.identifier);
            ObjectIdentifierToStructure[obj.identifier] = obj;
        }
    }
}

export function clearAvailableObjects()
{
    AvailableObjects.splice(0, AvailableObjects.length);
    for (const key in ObjectIdentifierToStructure)
    {
        delete ObjectIdentifierToStructure[key];
    }
}