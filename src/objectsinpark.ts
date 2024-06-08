/*
    Look at the park, and record some values about things that are present or not.
*/

import { ObjectDistributionTypes, ObjectPoolByDistributionType, getDistributionTypeForObject, getDistributionTypeForRide } from "./distributiontypepools";
import { handleLoadingIdentifier, handleUnloadingIdentifier } from "./objectloadunload";
import { SupportedObjectType, SupportedObjectTypes } from "./installedobjectlist";
import { removeResearchItemsForRide } from "./researchitems";
import { getConfigOption, getStaticStore } from "./sharedstorage";
import { log } from "./util/log";

export var forbiddenIndexes: Record<SupportedObjectType, number[]> = {
    ride:[],
    footpath_addition:[],
    footpath_railings:[],
    footpath_surface:[],
    park_entrance:[]
}

export var indexesPresentInWorld: Record<SupportedObjectType, number[]> = {
    ride:[],
    footpath_addition:[],
    footpath_railings:[],
    footpath_surface:[],
    park_entrance:[]
}

export var preferentialIndexQueue: Record<SupportedObjectType, number[]> = {
    ride:[],
    footpath_addition:[],
    footpath_railings:[],
    footpath_surface:[],
    park_entrance:[]
}

export var loadedIdentifiers: string[] = [];

export const OneOffObjects = ["JumpingFountains", "JumpingSnowballs", "QueueTV"] as const;
type OneOffObjectType = typeof OneOffObjects[number];

export const OneOffObjectIdentifiers: Record<OneOffObjectType, string> = 
{
    JumpingFountains:"rct2.footpath_item.jumpfnt1",
    JumpingSnowballs:"rct2.footpath_item.jumpsnw1",
    QueueTV:"rct2.footpath_item.qtv1"
} as const;

const OneOffObjectInitialStates: Record<OneOffObjectType, boolean> =
{
    JumpingFountains:false,
    JumpingSnowballs:false,
    QueueTV:false,
}

export function clearForbiddenIndexes()
{
    forbiddenIndexes = {
        ride:[],
        footpath_addition:[],
        footpath_railings:[],
        footpath_surface:[],
        park_entrance:[]
    };
    indexesPresentInWorld = {
        ride:[],
        footpath_addition:[],
        footpath_railings:[],
        footpath_surface:[],
        park_entrance:[]
    };
    preferentialIndexQueue = {
        ride:[],
        footpath_addition:[],
        footpath_railings:[],
        footpath_surface:[],
        park_entrance:[]
    };
    loadedIdentifiers = [];
    mapX = 0;
    mapY = 0;
}

let mapX = 0;
let mapY = 0;

const MAP_TILES_PER_TICK = 400;

function pushIfNotPresent<T>(arr: T[], obj: T)
{
    if (arr.indexOf(obj) <= -1)
    {
        arr.push(obj);
    }
}

export function findForbiddenIndexes()
{
    let tilesLeft = MAP_TILES_PER_TICK;
    while (mapX < map.size.x)
    {
        while (mapY < map.size.y)
        {
            let tile = map.getTile(mapX, mapY);
            for (const element of tile.elements)
            {
                if (element.type == "footpath")
                {
                    if (element.surfaceObject !== null)
                    {
                        pushIfNotPresent(indexesPresentInWorld["footpath_surface"], element.surfaceObject);
                        if (!getConfigOption("PathSurfaceReplaceExistingObjects"))
                        {
                            pushIfNotPresent(forbiddenIndexes["footpath_surface"], element.surfaceObject);
                        }
                        else
                        {
                            pushIfNotPresent(preferentialIndexQueue["footpath_surface"], element.surfaceObject);
                        }
                    }
                    if (element.railingsObject !== null)
                    {
                        pushIfNotPresent(indexesPresentInWorld["footpath_railings"], element.railingsObject);
                        if (!getConfigOption("PathSupportsReplaceExistingObjects"))
                        {
                            pushIfNotPresent(forbiddenIndexes["footpath_railings"], element.railingsObject);
                        }
                        else
                        {
                            pushIfNotPresent(preferentialIndexQueue["footpath_railings"], element.railingsObject);
                        }
                    }
                    if (element.addition !== null)
                    {
                        pushIfNotPresent(indexesPresentInWorld["footpath_addition"], element.addition);
                        if (!getConfigOption("PathAttachmentsReplaceExistingObjects"))
                        {
                            pushIfNotPresent(forbiddenIndexes["footpath_addition"], element.addition);
                        }
                        else
                        {
                            pushIfNotPresent(preferentialIndexQueue["footpath_addition"], element.addition);
                        }
                    }
                }
            }
            mapY++;
            tilesLeft--;
            if (tilesLeft <= 0)
            {
                return false;
            }
        }
        mapY = 0;
        mapX++;
    }
    for (const ride of map.rides)
    {
        let distType = getDistributionTypeForRide(ride.object.installedObject);
        if (distType == "drinkstall" || distType == "foodstall" || distType == "otherstall")
        {
            pushIfNotPresent(indexesPresentInWorld["ride"], ride.object.index);
            if (!getConfigOption("StallReplaceExistingObjects"))
            {
                pushIfNotPresent(forbiddenIndexes["ride"], ride.object.index);
            }
            else
            {
                pushIfNotPresent(preferentialIndexQueue["ride"], ride.object.index);
            }
        }
        else
        {
            pushIfNotPresent(indexesPresentInWorld["ride"], ride.object.index);
            if (!getConfigOption("RideReplaceExistingObjects"))
            {
                pushIfNotPresent(forbiddenIndexes["ride"], ride.object.index);
            }
            else
            {
                pushIfNotPresent(preferentialIndexQueue["ride"], ride.object.index);
            }
        }
    }
    return true;
}

export function unloadAllObjectsNotPresentInPark()
{
    for (const objType of SupportedObjectTypes)
    {
        let allLoaded = objectManager.getAllObjects(objType);
        for (const obj of allLoaded)
        {
            let distType = getDistributionTypeForObject(obj.installedObject);
            if (forbiddenIndexes[objType].indexOf(obj.index) <= -1 &&
                indexesPresentInWorld[objType].indexOf(obj.index) <= -1 &&
                distType !== null)
            {
                log(`Unloading ${obj.identifier} from index ${obj.index} as it is unused, added to pool ${distType}`, "allLoads");
                handleUnloadingIdentifier(obj.identifier);
                // Remove the research item, else it sticks around and points to the old index - potentially becomes a mismatched 
                // object type/vehicle index from we loaded in there instead, or a null research entry if not
                let thisIndex = obj.type == "ride" ? obj.index : undefined;

                // This call sets obj.identifier to undefined, it has to be done AFTER we want to push the identifier...
                objectManager.unload(obj.identifier);
                if (thisIndex !== undefined)
                    removeResearchItemsForRide(obj.index);
            }
            else
            {
                log(`${obj.identifier} is in use and can't be unloaded.`, "allLoads");
                loadedIdentifiers.push(obj.identifier);
            }
        }
    }
    return true;
}


export function removeLoadedObjectsFromPools()
{
    log(`${loadedIdentifiers.length} objects are in use in the park.`, "info");
    for (const currentDistType of ObjectDistributionTypes)
    {
        let lengthBefore = ObjectPoolByDistributionType[currentDistType].length;
        ObjectPoolByDistributionType[currentDistType] = ObjectPoolByDistributionType[currentDistType].filter((identifier) => loadedIdentifiers.indexOf(identifier) == -1);
        let lengthAfter = ObjectPoolByDistributionType[currentDistType].length;
        log(`Removed ${lengthBefore-lengthAfter} objects from distribution pool ${currentDistType} that are already in the park.`, "allLoads");
    }
    return true;
}

export function checkOneOffObjectInitialStates()
{
    let loadedAttachments = objectManager.getAllObjects("footpath_addition").map((obj) => obj.identifier);
    for (const oneOff of OneOffObjects)
    {
        OneOffObjectInitialStates[oneOff] = loadedAttachments.indexOf(OneOffObjectIdentifiers[oneOff]) > -1;
    }
    return true;
}

export function getOneOffObjectState(oneOff: OneOffObjectType)
{
    let dropdownValue: number;
    let spinnerValue: number;
    if (oneOff == "JumpingFountains")
    {
        dropdownValue = getStaticStore("JumpingFountainsAvailabilityCategory", 0).get();
        spinnerValue = getStaticStore("JumpingFountainsAvailabilityChance", 0).get();
    }
    else if (oneOff == "JumpingSnowballs")
    {
        dropdownValue = getStaticStore("JumpingSnowballsAvailabilityCategory", 0).get();
        spinnerValue = getStaticStore("JumpingSnowballsAvailabilityChance", 0).get();
    }
    else if (oneOff == "QueueTV")
    {
        dropdownValue = getStaticStore("QueueTVAvailabilityCategory", 0).get();
        spinnerValue = getStaticStore("QueueTVAvailabilityChance", 0).get();
    }
    else
    {
        log(`Missing handling for one off object ${oneOff}`, "error");
        return false;
    }
    // 0: default
    // 1: always available
    // 2: always x% chance
    // 3: x% if not available by default
    if (dropdownValue > 3 || dropdownValue < 0)
    {
        log(`Missing handling for one off dropdown type ${dropdownValue}`, "error");
        dropdownValue = 0;
    }
    if (dropdownValue == 0)
    {
        return OneOffObjectInitialStates[oneOff];
    }
    else if (dropdownValue == 2)
    {
        return context.getRandom(0, 100) < spinnerValue;
    }
    else if (dropdownValue == 3)
    {
        return OneOffObjectInitialStates[oneOff] || (context.getRandom(0, 100) < spinnerValue)
    }
    return true;
}

export function handleAssociationsForObjectsInPark()
{
    for (const objType of SupportedObjectTypes)
    {
        for (const index of indexesPresentInWorld[objType])
        {
            let obj = objectManager.getObject(objType, index);
            handleLoadingIdentifier(obj.identifier, true);
        }
    }
    return true;
}