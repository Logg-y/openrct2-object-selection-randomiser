/*
Main worker functions that involve loading random objects.
*/

import { NonRideObjectDistributionType, RideObjectDistributionType } from "./distributiontypepools";
import { OneOffObjectIdentifiers, OneOffObjects, getOneOffObjectState } from "./objectsinpark";
import { NonRideObjectsRequired, RideObjectsRequired, remainingItems } from "./numberofobjects";
import { log } from "./util/log";
import { pickRandomIdentifierRespectingSourcePreferences } from "./sourcepreference";
import { findIndexToLoadObjectOver, handleUnloadingIdentifier, tryToLoadObject } from "./objectloadunload";
import { randomiserProgressText } from "./mainworker";
import { StringTable, formatTokens } from "./util/strings";

const MAX_LOADS_PER_TICK = 1;

export function loadOneOffObjects()
{
    let loadedAttachments = objectManager.getAllObjects("footpath_addition").map((obj) => obj.identifier);
    for (const oneOff of OneOffObjects)
    {
        let load = getOneOffObjectState(oneOff);
        let isLoaded = loadedAttachments.indexOf(OneOffObjectIdentifiers[oneOff]) > -1;
        if (isLoaded != load)
        {
            if (load)
            {
                tryToLoadObject(OneOffObjectIdentifiers[oneOff], undefined, true);
            }
            else
            {
                objectManager.unload(OneOffObjectIdentifiers[oneOff]);
                handleUnloadingIdentifier(OneOffObjectIdentifiers[oneOff]);
            }
        }
    }
    return true;
}

let objectsLoadedThisTick = 0;

function loadRides(counts: RideObjectsRequired, invented: boolean)
{
    for (let run=0; run<MAX_LOADS_PER_TICK; run++)
    {
        if (objectsLoadedThisTick >= MAX_LOADS_PER_TICK)
        {
            return false;
        }
        let possibleTypes = Object.keys(counts).filter((key) => counts[key as RideObjectDistributionType] > 0);
        if (possibleTypes.length == 0)
        {
            return true;
        }
        let pickedDistributionType = possibleTypes[context.getRandom(0, possibleTypes.length)] as RideObjectDistributionType;
        let pickedIdentifier = pickRandomIdentifierRespectingSourcePreferences(pickedDistributionType);
        if (pickedIdentifier === undefined)
        {
            log(`Failed to get an identifier of type ${pickedDistributionType} to load, giving up.`, "sourcepreference");
        }
        else
        {
            let targetIndex = undefined;
            if (invented)
            {
                targetIndex = findIndexToLoadObjectOver(pickedDistributionType);
            }
            // If a load attempt fails, stop
            if (tryToLoadObject(pickedIdentifier, targetIndex, invented) == -1)
            {
                return true;
            }
            objectsLoadedThisTick++;
        }
        counts[pickedDistributionType]--;
    }
    return false;
}

function loadNonRides(counts: NonRideObjectsRequired)
{
    for (let run=0; run<MAX_LOADS_PER_TICK; run++)
    {
        if (objectsLoadedThisTick >= MAX_LOADS_PER_TICK)
        {
            return false;
        }
        let possibleTypes = Object.keys(counts).filter((key) => counts[key as NonRideObjectDistributionType] > 0);
        if (possibleTypes.length == 0)
        {
            return true;
        }
        let pickedDistributionType = possibleTypes[context.getRandom(0, possibleTypes.length)] as NonRideObjectDistributionType;
        let pickedIdentifier = pickRandomIdentifierRespectingSourcePreferences(pickedDistributionType);
        if (pickedIdentifier === undefined)
        {
            log(`Failed to get an identifier of type ${pickedDistributionType} to load, giving up.`, "sourcepreference");
        }
        else
        {
            let targetIndex = findIndexToLoadObjectOver(pickedDistributionType);
            // If a load attempt fails, stop
            if (tryToLoadObject(pickedIdentifier, targetIndex, true) == -1)
            {
                return true;
            }
            objectsLoadedThisTick++;
        }
        counts[pickedDistributionType]--;
    }
    return false;
}

export function loadRandomObjects()
{
    if (date.ticksElapsed % 200 != 0)
    {
        //return false;
    }
    if (remainingItems !== undefined)
    {
        objectsLoadedThisTick = 0;
        if (loadRides(remainingItems.invented, true))
        {
            if (loadRides(remainingItems.uninvented, false))
            {
                if (loadNonRides(remainingItems.nonResearcheable))
                {
                    return true;
                }
            }
        }
        if (date.ticksElapsed % 20 == 0)
        {
            let remainingItemCount = 0;
            for (const key of Object.keys(remainingItems))
            {
                let subObject = remainingItems[key as keyof typeof remainingItems];
                for (const subObjectKey of Object.keys(subObject))
                {
                    let subObjectAmount = subObject[subObjectKey as keyof typeof subObject];
                    remainingItemCount += subObjectAmount;
                }
            }
            randomiserProgressText.set(formatTokens(StringTable.LOAD_OBJECT_PROGRESS, String(remainingItemCount)));
        }
    }
    
    return false;
}