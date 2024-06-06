/*
    Look at the park, and find the object indexes that we aren't allowed to replace.
*/

import { ObjectPoolByDistributionType, getDistributionTypeForObject, getDistributionTypeForRide } from "./distributiontype";
import { SupportedObjectType, SupportedObjectTypes } from "./objectlist";
import { getConfigOption } from "./sharedstorage";
import { log } from "./util/log";

export const forbiddenIndexes: Record<SupportedObjectType, number[]> = {
    ride:[],
    footpath_addition:[],
    footpath_railings:[],
    footpath_surface:[],
    park_entrance:[]
}

export const indexesPresentInWorld: Record<SupportedObjectType, number[]> = {
    ride:[],
    footpath_addition:[],
    footpath_railings:[],
    footpath_surface:[],
    park_entrance:[]
}

export const preferentialIndexQueue: Record<SupportedObjectType, number[]> = {
    ride:[],
    footpath_addition:[],
    footpath_railings:[],
    footpath_surface:[],
    park_entrance:[]
}

export function clearForbiddenIndexes()
{
    for (const key in forbiddenIndexes)
    {
        let typedKey = key as SupportedObjectType;
        forbiddenIndexes[typedKey].splice(0, forbiddenIndexes[typedKey].length);
    }
    for (const key in indexesPresentInWorld)
    {
        let typedKey = key as SupportedObjectType;
        indexesPresentInWorld[typedKey].splice(0, indexesPresentInWorld[typedKey].length);
    }
    for (const key in preferentialIndexQueue)
    {
        let typedKey = key as SupportedObjectType;
        preferentialIndexQueue[typedKey].splice(0, indexesPresentInWorld[typedKey].length);
    }
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
                log(`Unloading ${obj.identifier} from index ${obj.index} as it is unused, added to pool ${distType}`, "info");
                ObjectPoolByDistributionType[distType].push(obj.identifier);
                // Remove the research item, else it sticks around and points to the old index - potentially becomes a mismatched 
                // object type/vehicle index from we loaded in there instead, or a null research entry if not
                if (obj.type == "ride")
                {
                    let researchItemsRemoved = 0;
                    for (let iter=0; iter<2; iter++)
                    {
                        let researchItems: ResearchItem[];
                        let targetList = iter == 0 ? park.research.inventedItems : park.research.uninventedItems;
                        researchItems = targetList.filter((item) => item.type == "ride" && item.object == obj.index);
                        if (researchItems.length > 0)
                        {
                            for (const researchItem of researchItems)
                            {
                                researchItemsRemoved++;
                                targetList.splice(targetList.indexOf(researchItem), 1);
                            }
                        }
                    }
                    if (researchItemsRemoved != 1)
                    {
                        log(`Expected to remove exactly 1 research item for ${obj.identifier} ${obj.name}, found ${researchItemsRemoved}`, "warning");
                    }
                }

                // This call sets obj.identifier to undefined, it has to be done AFTER we want to push the identifier...
                objectManager.unload(obj.identifier);
            }
        }
    }
    return true;
}