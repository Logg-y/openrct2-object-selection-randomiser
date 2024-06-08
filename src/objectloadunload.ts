/*
Provide common functions that do everything that needs doing every time we load or unload an object.
Doesn't do any of the main worker functions.
*/

import { ObjectDistributionType, ObjectDistributionTypeToAPIObjectType, ObjectPoolByDistributionType, addIdentifierToDistributionPool, getDistributionTypeForObject } from "./distributiontypepools";
import { ObjectAssociations } from "./objectassociation";
import { ObjectIdentifierToInstalledObject, SupportedObjectType } from "./installedobjectlist";
import { forbiddenIndexes, loadedIdentifiers, preferentialIndexQueue } from "./objectsinpark";
import { removeResearchItemsForRide, setRideIndexResearchState } from "./researchitems";
import { setErrorState } from "./util/errorhandler";
import { log } from "./util/log";
import { StringTable, formatTokens } from "./util/strings";


export function handleUnloadingIdentifier(identifier: string)
{
    let association = ObjectAssociations[identifier];
    let existingObject = ObjectIdentifierToInstalledObject[identifier];
    let existingDistributionType = getDistributionTypeForObject(existingObject);
    if (existingDistributionType !== null)            
    {
        addIdentifierToDistributionPool(existingObject.identifier);
    }
    loadedIdentifiers.splice(loadedIdentifiers.indexOf(identifier), 1);
    if (association !== undefined)
    {
        for (const cannotCoexistWithIdentifier of association.cannotCoexistWith)
        {
            let canThisObjectReenterPool = true;
            for (const loadedIdent of loadedIdentifiers)
            {
                let loadedIdentAssociation = ObjectAssociations[loadedIdent];
                if (loadedIdentAssociation !== undefined)
                {
                    if (loadedIdentAssociation.cannotCoexistWith.indexOf(cannotCoexistWithIdentifier) > -1)
                    {
                        canThisObjectReenterPool = false;
                        break;
                    }
                }
            }
            if (canThisObjectReenterPool)
            {
                log(`Readd ${cannotCoexistWithIdentifier} to object pool: ${identifier} was just unloaded and it was the last thing blocking it`, "allLoads");
                addIdentifierToDistributionPool(cannotCoexistWithIdentifier);
            }
        }
    }
}


export function tryToLoadObject(identifier: string, index: number | undefined, isInvented: boolean)
{
    log(`Trying to load ${identifier} at index ${index}...`, "allLoads");
    if (identifier === undefined)
    {
        log(`Tried to load an undefined identifier, probably means we ran out of objects.`, "warning");
        return -1;
    }
    // Whatever object we are about to try to squish gets (re)added to the object pool
    let apiObjectType = ObjectIdentifierToInstalledObject[identifier].type;
    if (index !== undefined)
    {
        let existingObject = objectManager.getObject(apiObjectType, index);
        if (existingObject !== null)
        {
            handleUnloadingIdentifier(existingObject.identifier);
        }
    }
    let loadReturn = objectManager.load(identifier, index);
    if (loadReturn == null)
    {
        log(`Attempting to load ${identifier} into ${apiObjectType} ${index} failed (null return)`, "error");
        setErrorState(formatTokens(StringTable.ERROR_LOAD_FAILED_NULL_RETURN, apiObjectType));
        return -1;
    }
    // If you have the object selection window open, objectManager.load returns but fails
    // So we want to try to read it back to make sure it went through
    if (objectManager.getObject(apiObjectType, loadReturn.index).identifier != identifier)
    {
        log(`Attempting to load ${identifier} into ${apiObjectType} ${index} failed (didn't take, likely object selection window is open)`, "error");
        setErrorState(StringTable.ERROR_LOAD_FAILED_OBJECT_SELECTION_OPEN);
        return -1;
    }
    if (index !== undefined && index !== loadReturn.index)
    {
        // A quick look through the c++ shows:
        // objectManager.load will try to unload the thing normally occupying that index BEFORE trying to load into it
        // ... but this LEAVES A NULL IN THAT SLOT which is awful if there are things in the park using that slot
        // ... and then on the next attempt it's quite happy to try loading a different object in there, and this kept causing me unexpected path -> queue conversions
        log(`Tried to load ${identifier} into index ${index}, but loader put it in ${loadReturn.index} instead`, "warning");
        objectManager.unload(apiObjectType, loadReturn.index);
        return tryToLoadObject(identifier, index, isInvented);
    }
    let replacementDistributionType = getDistributionTypeForObject(ObjectIdentifierToInstalledObject[identifier]);
    if (replacementDistributionType !== null)
    {
        let indexOfLoadedItem = ObjectPoolByDistributionType[replacementDistributionType].indexOf(identifier);
        if (indexOfLoadedItem > -1)
        {
            ObjectPoolByDistributionType[replacementDistributionType].splice(indexOfLoadedItem, 1);
            //log(`Remove newly added ${identifier} from object pool, pool now ${ObjectPoolByDistributionType[replacementDistributionType]}`, "allLoads");
        }
    }
    forbiddenIndexes[apiObjectType as SupportedObjectType].push(loadReturn.index);
    if (apiObjectType == "ride")
    {
        removeResearchItemsForRide(loadReturn.index);
        // Immediately after this finishes, the game will create a new entry for the object we just loaded
        // So we can make sure it's where we want it to be!
        setRideIndexResearchState(loadReturn.index, isInvented);
    }

    handleLoadingIdentifier(identifier, isInvented);
    return loadReturn.index
}

function canIndexBeUsed(distributionType: ObjectDistributionType, apiObjectType: ObjectType, trialIndex: number)
{
    let existingObjectAtThisIndex = objectManager.getObject(apiObjectType, trialIndex);
    if (existingObjectAtThisIndex == null)
    {
        return true;
    }
    let existingObjectDistributionType = getDistributionTypeForObject(existingObjectAtThisIndex.installedObject);
    // Limiting to same distribution type cuts out a lot of the hilarity of ride->ride replacements
    // but it also stops things like stalls and queue -> nonqueue from happening
    if (existingObjectDistributionType !== null && distributionType == existingObjectDistributionType)
    {
        return true;
    }

    return false;
}

export function findIndexToLoadObjectOver(distributionType: ObjectDistributionType)
{
    let apiObjectType = ObjectDistributionTypeToAPIObjectType[distributionType];
    let trialIndex = 0;
    let supportedObjectType = apiObjectType as SupportedObjectType;
    for (const preferredIndex of preferentialIndexQueue[supportedObjectType])
    {
        if (canIndexBeUsed(distributionType, apiObjectType, preferredIndex))
        {
            preferentialIndexQueue[supportedObjectType].splice(preferentialIndexQueue[supportedObjectType].indexOf(preferredIndex), 1);
            return preferredIndex;
        }
    }
    let forbiddenForThisAPIType = forbiddenIndexes[supportedObjectType];
    while (true)
    {
        if (forbiddenForThisAPIType.indexOf(trialIndex) == -1)
        {
            if (canIndexBeUsed(distributionType, apiObjectType, trialIndex))
            {
                return trialIndex;
            }
        }
        trialIndex++;
    }
}

function removeCannotCoexistWithObjectsFromPool(ident: string)
{
    let association = ObjectAssociations[ident];
    if (association != undefined)
    {
        for (const forbiddenIdent of association.cannotCoexistWith)
        {
            let forbiddenData = ObjectIdentifierToInstalledObject[forbiddenIdent];
            let forbiddenDistType = getDistributionTypeForObject(forbiddenData);
            if (forbiddenDistType !== null)
            {
                let indexOfForbiddenIdent = ObjectPoolByDistributionType[forbiddenDistType].indexOf(forbiddenIdent);
                if (indexOfForbiddenIdent > -1)
                {
                    log(`Removed ${forbiddenIdent} from pool for ${forbiddenDistType}: is forbidden by object ${ident}`, "allLoads");
                    ObjectPoolByDistributionType[forbiddenDistType].splice(indexOfForbiddenIdent, 1);
                }
            }
        }
    }
}

function loadAlwaysComesWithObjects(ident: string, isInvented: boolean)
{
    let association = ObjectAssociations[ident];
    if (association != undefined)
    {
        for (const alwaysComesWithIdent of association.alwaysComesWith)
        {
            let alwaysComesWithData = ObjectIdentifierToInstalledObject[alwaysComesWithIdent];
            let alwaysComesWithDistType = getDistributionTypeForObject(alwaysComesWithData);
            if (alwaysComesWithDistType !== null)
            {
                let indexOfAlwaysComesWithData = ObjectPoolByDistributionType[alwaysComesWithDistType].indexOf(alwaysComesWithIdent);
                if (indexOfAlwaysComesWithData > -1)
                {
                    let targetIndex = findIndexToLoadObjectOver(alwaysComesWithDistType);
                    log(`Try to load ${alwaysComesWithIdent} as a ${alwaysComesWithDistType}: ${ident} wants to always come with it, and it's not loaded yet`, "allLoads");
                    tryToLoadObject(alwaysComesWithData.identifier, targetIndex, isInvented);
                }
            }
        }
    }
}

export function handleLoadingIdentifier(identifier: string, isInvented: boolean)
{
    removeCannotCoexistWithObjectsFromPool(identifier);
    loadAlwaysComesWithObjects(identifier, isInvented);
    loadedIdentifiers.push(identifier);
}
