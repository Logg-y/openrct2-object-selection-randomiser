import { getConfigOption } from "./sharedstorage";
import { CompatibilityObjectIdentifiers, CompatibilityObjectToReplacement, EditorOnlyPathIdentifiers, InvisibleFootpathIdentifiers, PathIdentifiersWithRoundedAndSquareVariants, PathIdentifiersWithSlopedAndStairVariants } from "./standardobjectlist";

/**
 * Container for whether an object should always or never come with other objects.
 */
export interface ObjectAssociation
{
    /**
     * Whether or not this object is blocked from all inclusion.
    */
    blacklisted: boolean,
    /**
     * A list of object identifiers that this object should always come with.
     */
    alwaysComesWith: string[],
    /**
     * A list of object identifiers that this object can never come with.
     */
    cannotCoexistWith: string[],
}

/**
 * A global mapping of object identifiers to their ObjectAssociations.
 */
export const ObjectAssociations: Record<string, ObjectAssociation> = {};

const AssociationRules = [
    "AssociationRuleBlacklistCompatibilityObjects",
    "AssociationRulePreventPathStairAndSlopeVariants",
    "AssociationRulePreventPathSquareAndRoundedVariants",
    "AssociationRuleBlacklistInvisiblePath",
    "AssociationRuleBlacklistEditorOnlyPath",
    "AssociationRulePreventRideAndVehicleClassicDuplication",
] as const;
type AssociationRule = typeof AssociationRules[number];

const AssociationRulesToHandlers: Record<AssociationRule, ()=>void> = {
    AssociationRuleBlacklistCompatibilityObjects:() => { processListOfBlacklistedIdentifiers(CompatibilityObjectIdentifiers); processRecordOfExclusiveIdentifiers(CompatibilityObjectToReplacement); },
    AssociationRuleBlacklistEditorOnlyPath:() => processListOfBlacklistedIdentifiers(EditorOnlyPathIdentifiers),
    AssociationRuleBlacklistInvisiblePath:() => processListOfBlacklistedIdentifiers(InvisibleFootpathIdentifiers),
    AssociationRulePreventPathSquareAndRoundedVariants:() => processRecordOfExclusiveIdentifiers(PathIdentifiersWithRoundedAndSquareVariants),
    AssociationRulePreventPathStairAndSlopeVariants:() => processRecordOfExclusiveIdentifiers(PathIdentifiersWithSlopedAndStairVariants),
    AssociationRulePreventRideAndVehicleClassicDuplication:() => processRecordOfExclusiveIdentifiers(classicVehicleDuplication),
}

function processListOfBlacklistedIdentifiers(list: string[])
{
    for (const ident of list)
    {
        let association = getOrCreateNewAssociation(ident);
        association.blacklisted = true;
    }
}

function processRecordOfExclusiveIdentifiers(record: Record<string, string>)
{
    for (const identOne in record)
    {
        let identTwo = record[identOne];
        let associationOne = getOrCreateNewAssociation(identOne);
        let associationTwo = getOrCreateNewAssociation(identTwo);
        associationOne.cannotCoexistWith.push(identTwo);
        associationTwo.cannotCoexistWith.push(identOne);
    }
}

const classicVehicleDuplication: Record<string, string> =
{
    "rct1.ride.ladybird_trains":"rct2.ride.zldb",           // Classic mini ladybird -> Junior ladybird
    "rct1.ride.log_trains":"rct2.ride.zlog",                // Classic mini log -> Junior log
    "rct1.ride.stand_up_trains":"rct2.ride.togst",          // Classic stand up -> rct2 stand up
    "rct1.ride.wooden_rc_trains":"rct2.ride.ptct1",         // Classic wooden roller coaster -> rct2 wooden 4 person cars
} as const;

export function loadAssociations()
{
    for (const key of Object.keys(ObjectAssociations))
    {
        delete ObjectAssociations[key];
    }
    for (const key in AssociationRulesToHandlers)
    {
        let typedKey = key as AssociationRule;
        if (getConfigOption(typedKey))
        {
            const func = AssociationRulesToHandlers[typedKey];
            func();
        }
    }
    return true;
}

function getOrCreateNewAssociation(identifier: string)
{
    let saved = ObjectAssociations[identifier];
    if (saved === undefined)
    {
        saved = {alwaysComesWith:[], blacklisted:false, cannotCoexistWith:[]};
        ObjectAssociations[identifier] = saved;
    }
    return saved
}