import { clearForbiddenIndexes, findForbiddenIndexes, unloadAllObjectsNotPresentInPark } from "./forbiddenindexes";
import { loadDistributionTypesForAllRides, clearDistributionTypes, loadDistributionTypesForAllNonRides } from "./distributiontype";
import { clearAvailableObjects, listAvailableObjects } from "./objectlist";
import { calculateAllSourcePreferences, clearSourcePreferences } from "./sourcepreference";
import { log } from "./util/log";
import { StringTable } from "./util/strings";
import { calculateRemainingObjects } from "./numberofobjects";
import { loadRandomObjects } from "./objectrandomiser";

interface RandomiserStage
{
    name: string,
    callable: ()=>boolean,
    uiString?:string,
}

const RandomiserStages: RandomiserStage[] = [
    {
        name: "clearOldSourcePreferences",
        callable: clearSourcePreferences,
    },
    {
        name: "listAvailableObjects",
        callable: listAvailableObjects,
    },
    {
        name: "loadDistributionTypesRides",
        callable: loadDistributionTypesForAllRides,
    },
    {
        name:"loadDistributionTypesNonRides",
        callable: loadDistributionTypesForAllNonRides
    },
    {
        name: "calcAllSourcePreferences",
        callable: calculateAllSourcePreferences,
    }, 
    {
        name: "findForbiddenIndexes",
        callable: findForbiddenIndexes,
    },
    {
        name:"calcNumObjects",
        callable: calculateRemainingObjects
    },
    {
        name:"unloadUnusedObjects",
        callable: unloadAllObjectsNotPresentInPark
    },
    {
        name:"loadObjects",
        callable: loadRandomObjects,
    },
    {
        name: "cleanup",
        callable: cleanup,
    },
] as const;

function cleanup()
{
    clearAvailableObjects();
    clearSourcePreferences();
    clearDistributionTypes();
    clearForbiddenIndexes();
    return true;
}

let randomiserUpdateHook: IDisposable | undefined = undefined;

let randomiserStage = 0;

function randomiserUpdate()
{
    let stage = RandomiserStages[randomiserStage];
    if (stage.callable())
    {
        randomiserStage++;
        if (randomiserStage >= RandomiserStages.length)
        {
            log(`Complete!`, "info");
            randomiserUpdateHook?.dispose();
            randomiserStage = 0;
            return;
        }
        else
        {
            log(`Advance randomiser stage to ${randomiserStage}: ${RandomiserStages[randomiserStage].name}`, "info");
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
            return;
        }
    }
    log(`Beginning randomisation...`, "info");
    randomiserStage = 0;
    randomiserUpdateHook = context.subscribe("interval.tick", randomiserUpdate);
}