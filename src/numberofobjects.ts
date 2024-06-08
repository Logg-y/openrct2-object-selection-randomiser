/*
Work out exactly how many objects of each type we actually need to replace.
*/

import { getConfigOption, getDynamicStore } from "./sharedstorage";
import { log } from "./util/log";
import { RideObjectDistributionType, getDistributionTypeForNonRide, ObjectDistributionTypeToAPIObjectType } from "./distributiontypepools";
import { RideObjectDistributionTypes, getDistributionTypeForRide, NonRideObjectDistributionType } from "./distributiontypepools";
import { forbiddenIndexes } from "./objectsinpark";
import { ObjectIdentifierToInstalledObject, SupportedObjectType } from "./installedobjectlist";

export type RideObjectsRequired = Record<RideObjectDistributionType, number>;

export type QuantitySelectionPrefix = "Starting" | "Researchable" | "PathSurfaceNormal" | "PathSurfaceQueue" | "PathSupport" | "Benches" | "Bins" | "Lamps";

export type NonRideObjectsRequired = Record<NonRideObjectDistributionType, number>;

interface RequestedRides
{
    uninvented: RideObjectsRequired,
    invented: RideObjectsRequired,
}

interface RequestedObjects extends RequestedRides
{
    nonResearcheable: NonRideObjectsRequired,
}

export var remainingItems: RequestedObjects | undefined = undefined;

export function calculateRemainingObjects()
{
    let rides = calculateRemainingRides();
    let nonResearcheable = calculatedRemainingNonResearchable();
    remainingItems = {
        uninvented: rides.uninvented,
        invented: rides.invented,
        nonResearcheable: nonResearcheable,
    }
    log(`Total objects to load: ${JSON.stringify(remainingItems)}`, "info");
    return true;
}

function getTargetNumberOfObjects(prefix: QuantitySelectionPrefix, objType: "ride" | NonRideObjectDistributionType)
{
    let dropdownState = getDynamicStore(prefix + "QuantitySelection", 0).get();
    if (dropdownState != 2) // 0: Scenario default, 1: Scenario default, minimum X
    {
        let minAmt = getDynamicStore(prefix + "QuantitySelectionValue", 0).get();
        if (dropdownState == 0)
        {
            minAmt = 0;
        }
        if (dropdownState > 2)
        {
            log(`getTargetNumberOfObjects: dropdownState for ${prefix} is unsupported value ${dropdownState}`, "error");
        }
        if (prefix == "Starting")
        {
            return Math.max(minAmt, park.research.inventedItems.filter((item) => item.type == "ride").length);
        }
        else if (prefix == "Researchable")
        {
            return Math.max(minAmt, park.research.uninventedItems.filter((item) => item.type == "ride").length);
        }
        if (objType == "ride")
        {
            return Math.max(minAmt, objectManager.getAllObjects("ride").length);
        }
        let objectsByAPIType = objectManager.getAllObjects(ObjectDistributionTypeToAPIObjectType[objType]);
        let filter = function(obj: LoadedObject)
        {
            let thisDist = getDistributionTypeForNonRide(obj.installedObject);
            return thisDist == objType;
        }
        let matchingQty = objectsByAPIType.filter(filter).length;
        return Math.max(minAmt, matchingQty);
    }
    else
    {
        return getDynamicStore(prefix + "QuantitySelectionValue", 0).get();
    }
}

function weightedRideDistributionToRealQuantities(weights: RideObjectsRequired, numObjects: number)
{
    let weightSum = 0;
    for (const key in weights)
    {
        weightSum += weights[key as RideObjectDistributionType];
    }

    if (weightSum == 0)
    {
        for (const key in weights)
        {
            weights[key as RideObjectDistributionType] = 1;
            weightSum++;
        }
    }

    let totalAssigned = 0;
    let output: RideObjectsRequired = {
        transport:0,
        gentle:0,
        thrill:0,
        rollercoaster:0,
        water:0,
        drinkstall:0,
        foodstall:0,
        otherstall:0,
    };
    for (const key in weights)
    {
        let typedKey = key as RideObjectDistributionType;
        let thisWeight = weights[typedKey];
        let thisValue = Math.round(numObjects * (thisWeight/weightSum));
        totalAssigned += thisValue;
        output[typedKey] = thisValue;
    }
    // Handle rounding errors, either means reducing or increasing randomly based on weights until we get to the number that was asked for
    let leftoverAssignments = numObjects - totalAssigned;
    while (leftoverAssignments != 0)
    {
        let thisRoll = context.getRandom(0, weightSum);
        for (const key in weights)
        {
            let typedKey = key as RideObjectDistributionType;
            let thisWeight = weights[typedKey];
            thisRoll -= thisWeight;
            if (thisRoll < 0)
            {
                output[typedKey] += leftoverAssignments > 0 ? 1 : -1;
                break;
            }
        }
        leftoverAssignments += leftoverAssignments > 0 ? -1 : 1;
    }
    return output;
}



function calculatedRemainingNonResearchable(): NonRideObjectsRequired
{
    let output: NonRideObjectsRequired = {
        nonqueue_surface:getTargetNumberOfObjects("PathSurfaceNormal", "nonqueue_surface"),
        queue_surface:getTargetNumberOfObjects("PathSurfaceQueue", "queue_surface"),
        bench:getTargetNumberOfObjects("Benches", "bench"),
        bin:getTargetNumberOfObjects("Bins", "bin"),
        footpath_railings:getTargetNumberOfObjects("PathSupport", "footpath_railings"),
        lamp:getTargetNumberOfObjects("Lamps", "lamp"),
        park_entrance: getConfigOption("RandomiseParkEntrance") ? 1 : 0,
    }
    // Objects that we aren't allowed to replace need to be taken out of the uninvented counts
    const objectTypesToCheck: SupportedObjectType[] = ["footpath_surface", "footpath_railings", "footpath_addition"];
    for (const objTypeKey of objectTypesToCheck)
    {
        for (const forbiddenIndex of forbiddenIndexes[objTypeKey])
        {
            let forbiddenIdentifier = objectManager.getObject(objTypeKey, forbiddenIndexes.ride[forbiddenIndex]).identifier;
            let forbiddenDistType = getDistributionTypeForNonRide(ObjectIdentifierToInstalledObject[forbiddenIdentifier]);
            if (forbiddenDistType !== null)
            {
                output[forbiddenDistType] = Math.max(0, output[forbiddenDistType]-1);
            }
        }
    }
    return output;
}

function calculateRemainingRides(): RequestedRides
{
    let dropdownIndex = getDynamicStore("globalObjectDistributionDropdown", 0).get();
    let weights: RideObjectsRequired = {
        transport:0,
        gentle:0,
        thrill:0,
        rollercoaster:0,
        water:0,
        drinkstall:0,
        foodstall:0,
        otherstall:0,
    };
    if (dropdownIndex == 0) // 0: copy scenario default
    {
        // The actual counts of objects in the scenario's default research will work just fine if used as weights...
        let items: LoadedObject[] = [];
        items = items.concat(objectManager.getAllObjects("ride"));
        for (const obj of items)
        {
            if (obj.type == "ride")
            {
                let distType = getDistributionTypeForRide(obj.installedObject);
                if (distType !== null)
                {
                    weights[distType] = (weights[distType] ?? 0) + 1;
                }
            }
        }
    }
    else if (dropdownIndex != 0) // 1: manual setting
    {
        if (dropdownIndex != 1)
        {
            log(`getTargetNumberOfObjectsByType: unhandled dropdown index ${dropdownIndex}`, "error");
        }
        for (const distType of RideObjectDistributionTypes)
        {
            let thisWeight = getDynamicStore("globalObjectDistributionWeight" + distType, 5).get();
            weights[distType] = thisWeight;
            console.log(`Load saved weight for ${distType} = ${thisWeight}`);
        }
    }
    log(`Object weights: ${JSON.stringify(weights)}`, "info");
    let invented = weightedRideDistributionToRealQuantities(weights, getTargetNumberOfObjects("Starting", "ride"));
    let uninvented = weightedRideDistributionToRealQuantities(weights, getTargetNumberOfObjects("Researchable", "ride"));
    // Objects that we aren't allowed to replace need to be taken out of the uninvented counts
    for (const forbiddenRideIndex of forbiddenIndexes.ride)
    {
        let forbiddenRideIdentifier = objectManager.getObject("ride", forbiddenRideIndex).identifier;
        let forbiddenRideType = getDistributionTypeForRide(ObjectIdentifierToInstalledObject[forbiddenRideIdentifier]);
        if (forbiddenRideType !== null)
        {
            if (invented[forbiddenRideType] > 0)
            {
                invented[forbiddenRideType] = Math.max(0, invented[forbiddenRideType]-1);
            }
            else
            {
                uninvented[forbiddenRideType] = Math.max(0, uninvented[forbiddenRideType]-1);
            }
        }
    }

    return {invented:invented, uninvented:uninvented};
}