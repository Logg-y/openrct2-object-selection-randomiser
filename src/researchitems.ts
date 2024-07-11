/*
Handle manipulations of the research queue.
*/

import { RideTypeToStallIdentifiers, getDistributionTypeForRide } from "./distributiontypepools";
import { ObjectIdentifierToInstalledObject } from "./installedobjectlist";
import { handleUnloadingIdentifier, tryToLoadObject } from "./objectloadunload";
import { indexesPresentInWorld } from "./objectsinpark";
import { ConfigOptionNumber, getStaticStore } from "./sharedstorage";
import { pickRandomIdentifierRespectingSourcePreferences } from "./sourcepreference";
import { setErrorState } from "./util/errorhandler";
import { log } from "./util/log";
import { StringTable } from "./util/strings";

const CASH_MACHINE_RIDE_TYPE = 45 as const;
const FIRST_AID_STALL_RIDE_TYPE = 48 as const;
const TOILET_RIDE_TYPE = 36 as const;
const INFO_KIOSK_RIDE_TYPE = 35 as const;

export function setRideIndexResearchState(rideIndex: number, researched: boolean)
{
    let removalList: "inventedItems" | "uninventedItems" = researched ? "uninventedItems" : "inventedItems";

    let researchItems = park.research[removalList].filter((item) => item.type == "ride" && item.object == rideIndex);
    if (researchItems.length <= 0)
    {
        // Nothing to move.
        return;
    }

    // Because ResearchFix (/src/openrct2/management.research.cpp) is unavoidably called between any writes we make to the two lists, this is more delicate than it looks
    // It looks like no matter which way round we are moving things, we need to operate on inventedItems first, otherwise it can mess us up

    // Also, just trying to .push directly to the object seemingly doesn't work - making a local variable, pushing to that and assigning is fine though
    // I am not entirely sure why.

    if (researched)
    {
        let temp = park.research.inventedItems;
        temp = temp.concat(researchItems);
        park.research.inventedItems = temp;

        park.research.uninventedItems = park.research.uninventedItems.filter((item) => !(item.type == "ride" && item.object == rideIndex));
    }
    else
    {
        park.research.inventedItems = park.research.inventedItems.filter((item) => !(item.type == "ride" && item.object == rideIndex));

        let temp = park.research.uninventedItems;
        temp = temp.concat(researchItems);
        park.research.uninventedItems = temp;
    }
    
    // We have to make sure one exists in uninvented before pushing to invented?
    park.research[removalList] = park.research[removalList].filter((item) => !(item.type == "ride" && item.object == rideIndex));

    researchItems = park.research[removalList].filter((item) => item.type == "ride" && item.object == rideIndex);
    if (researchItems.length > 0)
    {
        log(`Wanted to set ride index ${rideIndex} researched status to ${researched} but there are still ${researchItems.length} research items for it in the wrong list!`, "error");
    }
}

/**
 * Remove all research items for the given rideIndex.
 * This needs to be called AFTER the object is unloaded, else the engine immediately readds one!
 * @export
 * @param {number} rideIndex
 */
export function removeResearchItemsForRide(rideIndex: number)
{
    let researchItemsRemoved = 0;
    for (let iter=0; iter<2; iter++)
    {
        let targetList: "inventedItems" | "uninventedItems" = iter == 0 ? "inventedItems" : "uninventedItems";
        let lengthBefore = park.research[targetList].length;
        park.research[targetList] = park.research[targetList].filter((item) => !(item.type == "ride" && item.object == rideIndex));
        let lengthAfter = park.research[targetList].length;
        researchItemsRemoved += (lengthBefore - lengthAfter);
    }
    if (researchItemsRemoved != 1)
    {
        //log(`Expected to remove exactly 1 research item for ride that was in index ${rideIndex}, found ${researchItemsRemoved}`, "warning");
    }
}

const StallTypes = ["foodstall", "drinkstall", "toilets", "first_aid", "cash_machine", "info_kiosk"] as const;
export type StallType = typeof StallTypes[number];

type StallAvailabilities = Record<StallType, StallAvailability>;

interface StallAvailability
{
    strict: boolean,
    time: number | undefined,
}

const ScenarioInitialStallAvailability: StallAvailabilities =
{
    "foodstall":{strict:false, time:undefined},
    "drinkstall":{strict:false, time:undefined},
    "toilets":{strict:false, time:undefined},
    "first_aid":{strict:false, time:undefined},
    "cash_machine":{strict:false, time:undefined},
    "info_kiosk":{strict:false, time:undefined},
}

export function getInitialStallAvailability()
{
    for (const stallType of StallTypes)
    {
        ScenarioInitialStallAvailability[stallType] = {strict:false, time:undefined};
    }
    let availability = getCurrentStallAvailability();
    for (const stallType of StallTypes)
    {
        ScenarioInitialStallAvailability[stallType] = availability[stallType];
    }
    return true;
}

function getCurrentStallAvailability(): StallAvailabilities
{
    let output: StallAvailabilities = {
        "foodstall":{strict:false, time:undefined},
        "drinkstall":{strict:false, time:undefined},
        "toilets":{strict:false, time:undefined},
        "first_aid":{strict:false, time:undefined},
        "cash_machine":{strict:false, time:undefined},
        "info_kiosk":{strict:false, time:undefined},
    }
    let currentTime = -1;
    for (let iter=0; iter<2; iter++)
    {
        let thisList: "inventedItems" | "uninventedItems" = iter == 0 ? "inventedItems" : "uninventedItems";
        for (const researchItem of park.research[thisList])
        {
            if (researchItem.type == "ride" && researchItem.category == "shop")
            {
                // We start at -1 (for initially discovered)
                // So when iter == 1, we go up to 0 straight away
                currentTime += iter;
                let thisIndex = researchItem.object;
                let thisObject = objectManager.getObject("ride", thisIndex);
                let key: StallType | undefined = getStallTypeForIdentifier(thisObject.identifier);
                if (key !== undefined && output[key].time === undefined)
                {
                    log(`Found stall type ${key} at time ${currentTime}: ${thisObject.identifier}`, "stallresearch");
                    output[key].time = currentTime;
                }
            }
        }
    }
    return output;
}

function getOneStallTimeConstraint(dropdownKey: ConfigOptionNumber, spinnerKey: ConfigOptionNumber, stallType: StallType): StallAvailability
{
    let dropdownState = getStaticStore(dropdownKey, 0).get();
    // 0: mimic scenario (strict)
    // 1: mimic scenario if stall type is normally available, if not then random
    // 2: always at start
    // 3: always before some value...
    // 4: completely random
    // 5: never
    if (dropdownState > 4)
    {
        log(`Stall time constraint for ${dropdownKey} is unhandled value ${dropdownState}`, "error");
        dropdownState = 0;
    }
    if (dropdownState == 0)
    {
        return {time:ScenarioInitialStallAvailability[stallType].time, strict:true};
    }
    if (dropdownState == 1)
    {
        if (ScenarioInitialStallAvailability[stallType].time !== undefined)
        {
            return {time:ScenarioInitialStallAvailability[stallType].time, strict:true};
        }
        return {time:undefined, strict:false};
    }
    else if (dropdownState == 2)
    {
        return {time:-1, strict:true};
    }
    else if (dropdownState == 3)
    {
        let spinnerValue = getStaticStore(spinnerKey, 0).get();
        return {time:spinnerValue, strict:false}
    }
    else if (dropdownState == 4)
    {
        return {time:undefined, strict:false};
    }
    else
    {
        return {time:undefined, strict:true};
    }
}

/**
 *  Return a record of stall type : the largest amount of stall researches before getting one of this stall type, or undefined if no limit
 *
 */
function getRequestedStallTimeConstraints(): StallAvailabilities
{
    return {
        cash_machine: getOneStallTimeConstraint("CashMachineAvailabilityCategory", "CashMachineAvailabilityEarliness", "cash_machine"),
        drinkstall: getOneStallTimeConstraint("DrinkStallAvailabilityCategory", "DrinkStallAvailabilityEarliness", "drinkstall"),
        foodstall: getOneStallTimeConstraint("FoodStallAvailabilityCategory", "FoodStallAvailabilityEarliness", "foodstall"),
        first_aid: getOneStallTimeConstraint("FirstAidAvailabilityCategory", "FirstAidAvailabilityEarliness", "first_aid"),
        toilets: getOneStallTimeConstraint("ToiletAvailabilityCategory", "ToiletAvailabilityEarliness", "toilets"),
        info_kiosk: getOneStallTimeConstraint("InfoKioskAvailabilityCategory", "InfoKioskAvailabilityEarliness", "info_kiosk"),
    }
}

function fixCollidingStrictRequirements(timeConstraints: StallAvailabilities): Record<number, StallType>
{
    let strictRequestTimes: Record<number, StallType> = {};
    let modified = true;
    timeConstraints = getRequestedStallTimeConstraints();
    let i = 0;
    while (modified && i < 250)
    {
        i++;
        modified = false;
        for (const stallType of StallTypes)
        {
            if (timeConstraints[stallType].time !== undefined)
            {
                let thisTime = (timeConstraints[stallType].time ?? 0);
                if (timeConstraints[stallType].strict && thisTime >= 0)
                {
                    if (strictRequestTimes[thisTime] !== undefined)
                    {
                        timeConstraints[stallType].time = (timeConstraints[stallType].time ?? 0) + 1;
                        modified = true;
                        break;
                    }
                    strictRequestTimes[thisTime] = stallType;
                }
            }
        }
    }
    return strictRequestTimes;
}

function introduceNewStallOfType(stallType: StallType)
{
    // This means introducing a new stall
    let identifier: string | undefined = undefined;
    if (stallType == "foodstall" || stallType == "drinkstall")
    {
        identifier = pickRandomIdentifierRespectingSourcePreferences(stallType);
    }
    else
    {
        let rideType: number | undefined = undefined;
        if (stallType == "cash_machine") rideType = CASH_MACHINE_RIDE_TYPE; 
        else if (stallType == "first_aid") rideType = FIRST_AID_STALL_RIDE_TYPE; 
        else if (stallType == "toilets") rideType = TOILET_RIDE_TYPE;
        else if (stallType == "info_kiosk") rideType = INFO_KIOSK_RIDE_TYPE;
        if (rideType !== undefined)
        {
            identifier = RideTypeToStallIdentifiers[rideType][context.getRandom(0, RideTypeToStallIdentifiers[rideType].length)];
        }
    }
    if (identifier === undefined)
    {
        log(`Could not find a stall of type ${stallType} to load to meet requested timespan`, "error");
    }
    // This can mess up a lot of things. If nothing else, we don't know the current time of the new stall we just added
    // and it could have cascading impact on others once moved, so start again
    else
    {
        log(`load ${identifier} to satisfy demand for stall type ${stallType}`, "stallresearch");
        tryToLoadObject(identifier, undefined, false);
        return true;
    }
    return false;
}

function unloadAllStallsOfType(stallType: StallType)
{
    let identsToUnload: string[] = [];
    let indexesToRemoveResearchFor: number[] = [];
    let searchList = park.research.uninventedItems.concat(park.research.inventedItems);
    for (const researchItem of searchList)
    {
        if (researchItem.type == "ride")
        {
            if (researchItem.category == "shop")
            {
                let thisIdent = objectManager.getObject("ride", researchItem.object).identifier;
                let thisObjStallType = getStallTypeForIdentifier(thisIdent);
                if (thisObjStallType == stallType)
                {
                    if (indexesPresentInWorld["ride"].indexOf(researchItem.object) == -1)
                    {
                        identsToUnload.push(thisIdent);
                        indexesToRemoveResearchFor.push(researchItem.object);
                    }
                    else
                    {
                        log(`Wanted to unload ${thisIdent} so that no ${stallType}-s are available, but it is in the world already`, "info");
                    }
                }
            }
        }
    }
    if (identsToUnload.length > 0)
    {
        for (const ident of identsToUnload)
        {
            log(`Unload ${ident}: stall availability requests that no ${stallType}-s are available`, "info");
            objectManager.unload(ident);
            handleUnloadingIdentifier(ident);
        }
        park.research.inventedItems = park.research.inventedItems.filter((item) => (item.type !== "ride" || item.category !== "shop" || indexesToRemoveResearchFor.indexOf(item.object) == -1));
        park.research.uninventedItems = park.research.uninventedItems.filter((item) => (item.type !== "ride" || item.category !== "shop" || indexesToRemoveResearchFor.indexOf(item.object) == -1));
        return true
    }
    return false;
}

export function processResearchQueue()
{
    let temp = park.research.uninventedItems;
    shuffleArray(temp);
    park.research.uninventedItems = temp;
    // The sorting logic will get very stuck if there are multiple strict time requests for the same > 0 time
    let i = 0;
    while (true)
    {
        i++;
        if (i > 500)
        {
            setErrorState(StringTable.ERROR_RESEARCH_ORDERING);
            return true;
        }
        let timeConstraints = getRequestedStallTimeConstraints();
        let strictRequestTimes = fixCollidingStrictRequirements(timeConstraints);
        log(`Requested time constraints: ${JSON.stringify(timeConstraints)}`, "stallresearch");
        let restartLoop = false;
        for (const stallType of StallTypes)
        {
            let availability = getCurrentStallAvailability();
            let required = timeConstraints[stallType]
            let current = availability[stallType];
            log(`inner loop ${stallType}: current ${JSON.stringify(current)} vs required ${JSON.stringify(required)}`, "stallresearch");
            if (required.time !== undefined)
            {
                if (current.time === undefined)
                {
                    restartLoop = introduceNewStallOfType(stallType)
                    // If we fail, don't try this again
                    if (!restartLoop)
                    {
                        timeConstraints[stallType].time = undefined;
                        timeConstraints[stallType].strict = false;
                    }
                    else
                    {
                        break;
                    }
                }
                else
                {
                    if (adjustStallResearchTime(stallType, availability, timeConstraints, strictRequestTimes))
                    {
                        restartLoop = true;
                        break;
                    }
                }
            }
            else if (required.strict && required.time === undefined)
            {
                // Strict + time==undefined means this stall type isn't allowed at all
                if (current.time !== undefined)
                {
                    if (unloadAllStallsOfType(stallType))
                    {
                        restartLoop = true;
                        break;
                    }
                }
            }
        }
        if (!restartLoop)
            break;
    }
    return true;
}

function swapStallResearchOrders(stall1Index: number, stall2Index: number)
{
    let stall1RealIndex: undefined | number = undefined;
    let stall2RealIndex: undefined | number = undefined;
    let numFoundStalls = 0;
    let index = 0;
    for (const item of park.research.uninventedItems)
    {
        if (item.type == "ride" && item.category == "shop")
        {
            if (numFoundStalls == stall1Index) { stall1RealIndex = index; }
            else if (numFoundStalls == stall2Index) { stall2RealIndex = index; }
            numFoundStalls++;
            if (stall1RealIndex !== undefined && stall2RealIndex !== undefined)
                break;
        }
        index++;
    }
    // If we are trying to swap to a stall beyond what exists, eg there are only 2 researchable stalls and we want to swap 0 with 2
    // the 2 is going to come out undefined
    log(`Swap stall order indexes ${stall1Index} ${stall2Index} -> ${stall1RealIndex} ${stall2RealIndex}`, "stallresearch");
    if (stall1RealIndex !== undefined && stall2RealIndex !== undefined)
    {
        //let stall1Data = {...park.research.uninventedItems[stall1RealIndex]};
        //let stall2Data = {...park.research.uninventedItems[stall2RealIndex]};
        //log(`1data: ${stall1Data} ${JSON.stringify(stall1Data)}`, "stallresearch");
        //log(`2data: ${stall2Data}  ${JSON.stringify(stall2Data)}`, "stallresearch");
        let workingCopy = park.research.uninventedItems;
        [workingCopy[stall1RealIndex], workingCopy[stall2RealIndex]] = [
            workingCopy[stall2RealIndex], workingCopy[stall1RealIndex]];
        
        log(`After: working copy: ${JSON.stringify(workingCopy[stall1RealIndex])} ${JSON.stringify(workingCopy[stall2RealIndex])}`, "stallresearch");
        park.research.uninventedItems = workingCopy;
        log(`After: live data: ${JSON.stringify(park.research.uninventedItems[stall1RealIndex])} ${JSON.stringify(park.research.uninventedItems[stall2RealIndex])}`, "stallresearch");
        return true;
    }
    return false;
}

function moveNthUninventedStallToInvented(n: number)
{
    // Move to invented
    let index = 0;
    for (const item of park.research.uninventedItems)
    {
        if (item.type == "ride" && item.category == "shop")
        {
            if (index == n)
            {
                log(`set uninvented stall ${n}: ${objectManager.getObject('ride', item.object).identifier} to researched`, "stallresearch")
                setRideIndexResearchState(item.object, true);
                return;
            }
            index++;
        }
    }
}

function adjustStallResearchTime(stallType: StallType, currentAvailability: StallAvailabilities, requirement: StallAvailabilities, strictRequestTimes: Record<number, StallType>)
{
    if (requirement[stallType].time !== undefined && currentAvailability[stallType].time !== undefined)
    {
        let requirementTime = requirement[stallType].time as number;
        let currentTime = currentAvailability[stallType].time as number;
        // If strict, all stalls of this type must be in uninvented if time > 0
        if (requirement[stallType].strict)
        {
            
            if (requirementTime >= 0)
            {
                let movedStall = true;
                let i = 0;
                while (movedStall && i < 200)
                {
                    movedStall = false;
                    for (const researchItem of park.research.inventedItems)
                    {
                        if (researchItem.type == "ride" && researchItem.category == "shop")
                        {
                            let rideObject = objectManager.load("ride", researchItem.object);
                            if (rideObject !== null)
                            {
                                if (getDistributionTypeForRide(rideObject.installedObject) == stallType || 
                                    (stallType == "first_aid" && researchItem.rideType == FIRST_AID_STALL_RIDE_TYPE) ||
                                    (stallType == "toilets" && researchItem.rideType == TOILET_RIDE_TYPE) ||
                                    (stallType == "info_kiosk" && researchItem.rideType == INFO_KIOSK_RIDE_TYPE) ||
                                    (stallType == "cash_machine" && researchItem.rideType == CASH_MACHINE_RIDE_TYPE))
                                {
                                    log(`Stalltype ${stallType} wants all to be in uninvented, moving index ${researchItem.object}`, "stallresearch")
                                    setRideIndexResearchState(researchItem.object, false);
                                    movedStall = true;
                                    break;
                                }
                            }
                        }
                    }
                    i++;
                }
                if (i >= 200)
                {
                    setErrorState(StringTable.ERROR_RESEARCH_ORDERING);
                    return false;
                }
            }
            if (requirementTime !== currentTime)
            {
                if (requirementTime >= 0)
                {
                    log(`Swap current availability ${currentTime} to requirement ${requirementTime} because it is strict`, "stallresearch")
                    if (swapStallResearchOrders(requirementTime, currentTime))
                    {
                        return true;
                    }
                    log(`Swap failed.`, "stallresearch")
                }
                else
                {
                    log(`Set current availability ${currentTime} to researched to meet strict requirement ${requirementTime}`, "stallresearch")
                    moveNthUninventedStallToInvented(currentTime);
                    return true;
                }
            }
        }
        else if (currentTime > requirementTime)
        {
            let targetIndex = requirementTime;
            while (targetIndex >= 0)
            {
                // Can always move to initially discovered safely
                if (targetIndex < 0)
                {
                    break;
                }
                // Can't swap with anything else that is currently at its requirement
                // otherwise this can develop into an endless loop of swapping two stalls with each other as they fight to meet their requirement
                let indexIsValid = true;
                for (const otherStallType of StallTypes)
                {
                    let otherRequirement = requirement[otherStallType].time;
                    let otherCurrent = currentAvailability[otherStallType].time;
                    if (otherCurrent == targetIndex)
                    {
                        if (otherRequirement !== undefined && otherStallType != stallType && otherRequirement < currentTime)
                        {
                            indexIsValid = false;
                            log(`Can't swap to ${targetIndex}: would make ${otherStallType} fail its target time`, "stallresearch");
                            break;
                        }
                    }
                }
                if (indexIsValid && strictRequestTimes[targetIndex] == undefined)
                {
                    break;
                }
                targetIndex--;
            }
            if (targetIndex < 0)
            {
                log(`Move ${currentTime} to researched to get below requirement of ${requirementTime}`, "stallresearch");
                moveNthUninventedStallToInvented(currentTime);
                return true;
            }
            else
            {
                log(`Swap ${currentTime} and ${targetIndex} to get the first below requirement of ${requirementTime}`, "stallresearch");
                if (swapStallResearchOrders(currentTime, targetIndex))
                {
                    return true;
                }
                log(`Swap failed.`, "stallresearch")
            }
        }
    }
    return false;
}


function shuffleArray(array: any[])
{
    let currIndex = array.length;
    while (currIndex > 0)
    {
        let randIndex = Math.floor(context.getRandom(0, currIndex));
        currIndex--;
        [array[currIndex], array[randIndex]] = [
            array[randIndex], array[currIndex]];
        
    }
}

function getStallTypeForIdentifier(ident: string): StallType | undefined
{
    let installedObj = ObjectIdentifierToInstalledObject[ident];
    let distType = getDistributionTypeForRide(installedObj);
    if (distType == "drinkstall" ||  distType == "foodstall")
    {
        return distType;
    }
    if (RideTypeToStallIdentifiers[TOILET_RIDE_TYPE].indexOf(ident) > -1)
        return "toilets"
    if (RideTypeToStallIdentifiers[CASH_MACHINE_RIDE_TYPE].indexOf(ident) > -1)
        return "cash_machine"
    if (RideTypeToStallIdentifiers[FIRST_AID_STALL_RIDE_TYPE].indexOf(ident) > -1)
        return "first_aid"
    if (RideTypeToStallIdentifiers[INFO_KIOSK_RIDE_TYPE].indexOf(ident) > -1)
        return "info_kiosk"
    return undefined;
}