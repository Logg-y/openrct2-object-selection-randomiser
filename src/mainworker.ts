import { checkOneOffObjectInitialStates, clearForbiddenIndexes, findForbiddenIndexes, handleAssociationsForObjectsInPark, removeLoadedObjectsFromPools, unloadAllObjectsNotPresentInPark } from "./objectsinpark";
import { loadDistributionTypesForAllRides, clearDistributionTypes, loadDistributionTypesForAllNonRides } from "./distributiontypepools";
import { clearAvailableObjects, listAvailableObjects } from "./installedobjectlist";
import { calculateAllSourcePreferences, clearSourcePreferences } from "./sourcepreference";
import { log } from "./util/log";
import { StringTable, formatTokens } from "./util/strings";
import { calculateRemainingObjects } from "./numberofobjects";
import { loadRandomObjects } from "./objectrandomiser";
import { loadAssociations } from "./objectassociation";
import { getInitialStallAvailability, processResearchQueue } from "./researchitems";
import { store } from "openrct2-flexui";
import { clearErrorState, errorState } from "./util/errorhandler";

interface RandomiserStage
{
    name: string,
    callable: ()=>boolean,
    uiString?:string,
}

export let randomiserCurrentStageText = store<string>("");
export let randomiserProgressText = store<string>("");

const RandomiserStages: RandomiserStage[] = [
    {
        name: "clearOldSourcePreferences",
        callable: clearSourcePreferences,
        uiString: StringTable.LABEL_CLEAR_OLD_SOURCE_PREFERENCES,
    },
    {
        name: "listAvailableObjects",
        callable: listAvailableObjects,
        uiString: StringTable.LABEL_LIST_AVAILABLE_OBJECTS,
    },
    {
        name:"loadObjectAssociations",
        callable: loadAssociations,
        uiString: StringTable.LABEL_LOAD_ASSOCIATIONS,
    },
    {
        name:"checkOneOffObjectInitialStates",
        callable: checkOneOffObjectInitialStates,
        uiString: StringTable.LABEL_CHECK_ONE_OFF_INITIAL_STATES,
    },
    {
        name: "loadDistributionTypesRides",
        callable: loadDistributionTypesForAllRides,
        uiString: StringTable.LABEL_LOAD_RIDE_DISTRIBUTION_TYPES,
    },
    {
        name:"loadDistributionTypesNonRides",
        callable: loadDistributionTypesForAllNonRides,
        uiString: StringTable.LABEL_LOAD_NONRIDE_DISTRIBUTION_TYPES,
    },
    {
        name: "calcAllSourcePreferences",
        callable: calculateAllSourcePreferences,
        uiString: StringTable.LABEL_LOAD_SOURCE_PREFERENCE,
    }, 
    {
        name: "getDefaultStallTimeAvailability",
        callable: getInitialStallAvailability,
        uiString: StringTable.LABEL_CHECK_STALL_AVAILABILITY,
    },
    {
        name: "findForbiddenIndexes",
        callable: findForbiddenIndexes,
        uiString: StringTable.LABEL_FORBIDDEN_INDEXES,
    },
    {
        name:"handleAssociationsForObjectsInPark",
        callable: handleAssociationsForObjectsInPark,
        uiString: StringTable.LABEL_HANDLE_ASSOCIATIONS_FOR_PRESENT_OBJECTS,
    },
    {
        name:"calcNumObjects",
        callable: calculateRemainingObjects,
        uiString: StringTable.LABEL_CALCULATE_NUMBER_OBJECTS,
    },
    {
        name:"unloadUnusedObjects",
        callable: unloadAllObjectsNotPresentInPark,
        uiString: StringTable.LABEL_UNLOAD_UNUSED,
    },
    {
        name:"removeLoadedObjectsFromPools",
        callable: removeLoadedObjectsFromPools,
        uiString: StringTable.LABEL_REMOVE_LOADED_FROM_POOLS,
    },
    {
        name:"loadObjects",
        callable: loadRandomObjects,
        uiString: StringTable.LABEL_LOADING_OBJECTS,
    },
    // Disable due to not showing up on palette
    /*
    {
        name:"loadOneOffObjects",
        callable: loadOneOffObjects,
    },
    */
    {
        name:"processResearchQueue",
        callable: processResearchQueue,
        uiString: StringTable.LABEL_PROCESS_RESEARCH_QUEUE,
    },
    {
        name: "cleanup",
        callable: cleanup,
        uiString: StringTable.LABEL_CLEANUP,
    },
    {
        name: "complete",
        callable: () => true,
        uiString: StringTable.LABEL_COMPLETE,
    },
] as const;

function cleanup()
{
    log(`Cleanup: available objects`, "info");
    clearAvailableObjects();
    log(`Cleanup: source preferences`, "info");
    clearSourcePreferences();
    log(`Cleanup: distribution types`, "info");
    clearDistributionTypes();
    log(`Cleanup: object in park info`, "info");
    clearForbiddenIndexes();
    return true;
}

export let randomiserUpdateHook: IDisposable | undefined = undefined;

let randomiserStage = 0;

function randomiserUpdate()
{
    let stage = RandomiserStages[randomiserStage];
    if (errorState != undefined)
    {
        randomiserCurrentStageText.set(StringTable.LABEL_FAILED);
        randomiserProgressText.set(formatTokens(StringTable.LABEL_ERROR, errorState));
        randomiserUpdateHook?.dispose();
        randomiserUpdateHook = undefined;
        return;
    }
    if (stage.callable())
    {
        randomiserStage++;
        if (randomiserStage >= RandomiserStages.length)
        {
            log(`Complete!`, "info");
            randomiserUpdateHook?.dispose();
            randomiserUpdateHook = undefined;
            randomiserStage = 0;
            return;
        }
        else
        {
            log(`Advance randomiser stage to ${randomiserStage}: ${RandomiserStages[randomiserStage].name}`, "info");
            let newStage = RandomiserStages[randomiserStage];
            if (newStage.uiString !== undefined)
            {
                randomiserCurrentStageText.set(newStage.uiString);
            }
            randomiserProgressText.set("");
        }
    }
}

export function randomise()
{
    if (randomiserUpdateHook != undefined)
    {
        if (typeof ui !== "undefined")
        {
            ui.showError(StringTable.ERROR, StringTable.RANDOMISER_ALREADY_RUNNING);
        }
        return false;
    }
    clearErrorState();
    log(`Beginning randomisation...`, "info");
    randomiserStage = 0;
    randomiserUpdateHook = context.subscribe("interval.tick", randomiserUpdate);
    return true;
}