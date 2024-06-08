import { WritableStore, store } from "openrct2-flexui";

type StoreRecord = Record<string, WritableStore<number | boolean>>;

// Use this for writing only. getConfigOption is the thing to use for reading values out of the UI stores
// This is for the static, typesafe stores only.
export const staticConfigMap: StoreRecord = {};

// This is for when we need to refer to stores from non-static keys, such as for repeating structures (source games, object type distribution)...
// ... we can still just save and retrieve this map in exactly the same way, it just lacks the key safety typescript can give for the fixed configs.
export const dynamicStoreMap: StoreRecord = {};

const boolOptions =
[
    "TreesAlwaysAvailable",
    "ShrubsAlwaysAvailable",
    "GardensAlwaysAvailable",
    "FencesWallsAlwaysAvailable",
    "PathAttachmentsAlwaysAvailable",
    "RandomiseRidesStalls",
    "RandomisePathSurfaces",
    "RandomisePathSupports",
    "RandomiseBenches",
    "RandomiseLamps",
    "RandomiseBins",
    "RandomiseParkEntrance",
    "RideReplaceExistingObjects",
    "StallReplaceExistingObjects",
    "PathSurfaceReplaceExistingObjects",
    "PathSupportsReplaceExistingObjects",
    "PathAttachmentsReplaceExistingObjects",
    "AssociationRuleBlacklistCompatibilityObjects",
    "AssociationRulePreventPathStairAndSlopeVariants",
    "AssociationRulePreventPathSquareAndRoundedVariants",
    "AssociationRuleBlacklistInvisiblePath",
    "AssociationRuleBlacklistEditorOnlyPath",
    "AssociationRulePreventRideAndVehicleClassicDuplication",
    
] as const;
const numberOptions =
[
    "FoodStallAvailabilityCategory",
    "DrinkStallAvailabilityCategory",
    "ToiletAvailabilityCategory",
    "CashMachineAvailabilityCategory",
    "FirstAidAvailabilityCategory",
    "FoodStallAvailabilityEarliness",
    "DrinkStallAvailabilityEarliness",
    "ToiletAvailabilityEarliness",
    "CashMachineAvailabilityEarliness",
    "FirstAidAvailabilityEarliness",

    "QueueTVAvailabilityCategory",
    "JumpingFountainsAvailabilityCategory",
    "JumpingSnowballsAvailabilityCategory",
    "QueueTVAvailabilityChance",
    "JumpingFountainsAvailabilityChance",
    "JumpingSnowballsAvailabilityChance",
] as const;


export type ConfigOptionBoolean = typeof boolOptions[number];
export type ConfigOptionNumber = typeof numberOptions[number];

export type ConfigOption = ConfigOptionBoolean | ConfigOptionNumber;

function isNumberOption(opt: ConfigOption): opt is ConfigOptionNumber
{
    return numberOptions.filter((item) => item == opt).length > 0;
}


export function getConfigOption(opt: ConfigOptionBoolean): boolean;
export function getConfigOption(opt: ConfigOptionNumber): number;
export function getConfigOption(opt: ConfigOption): boolean | number
{
    let obj = staticConfigMap[opt];
    if (obj === undefined)
    {
        if (ui !== undefined)
        {
            throw new Error(`getConfigOption: unknown opt ${opt}`);
        }
        //return -1;
        return isNumberOption(opt) ? -1 : false;
    }
    if (isNumberOption(opt))
    {
        return staticConfigMap[opt].get() as number;
    }
    else
    {
        return staticConfigMap[opt].get() as boolean;
    }
}


type SavedMap = Record<string, number|boolean>;

function loadMapFromSharedStorage(mapName: string, configMap: StoreRecord)
{
    let savedMap = context.sharedStorage.get<SavedMap>(mapName);
    if (savedMap !== undefined)
    {
        for (let key in savedMap)
        {
            // When removing or renaming store keys this attempts undefined.set
            // This is also a nice time to avoid clogging shared storage with stuff that's not active any more
            if (configMap[key] === undefined)
            {
                console.log("Purging now unused key " + key);
                delete savedMap[key];
                context.sharedStorage.set<SavedMap>("ObjectSelectionRandomiser.StaticConfig", savedMap);
                continue;
            }
            configMap[key].set(savedMap[key]);
        }
    }
}

export function loadFromSharedStorage()
{
    loadMapFromSharedStorage("ObjectSelectionRandomiser.StaticConfig", staticConfigMap);
    loadMapFromSharedStorage("ObjectSelectionRandomiser.DynamicConfig", dynamicStoreMap);
}

function saveMapToSharedStorage(mapName: string, configMap: StoreRecord)
{
    let savedMap: SavedMap = {};
    for (let key in configMap)
    {
        savedMap[key] = configMap[key].get();
    }
    context.sharedStorage.set<SavedMap>(mapName, savedMap);
}

export function saveToSharedStorage()
{
    saveMapToSharedStorage("ObjectSelectionRandomiser.StaticConfig", staticConfigMap);
    saveMapToSharedStorage("ObjectSelectionRandomiser.DynamicConfig", dynamicStoreMap);
}

export function getDynamicStore(key: string, defaultval: number): WritableStore<number>
export function getDynamicStore(key: string, defaultval: boolean): WritableStore<boolean>
export function getDynamicStore<T extends number | boolean>(key: string, defaultval: T): WritableStore<T>
{
    let val = dynamicStoreMap[key];
    if (val !== undefined)
    {
        return val as WritableStore<T>
    }
    dynamicStoreMap[key] = store<T>(defaultval);
    return dynamicStoreMap[key] as WritableStore<T>;
}

export function getStaticStore(key: ConfigOptionNumber, defaultval: number): WritableStore<number>
export function getStaticStore(key: ConfigOptionBoolean, defaultval: boolean): WritableStore<boolean>
export function getStaticStore(key: ConfigOption, defaultval: number | boolean): WritableStore<boolean> | WritableStore<number>
{
    let savedStore = staticConfigMap[key];
    if (isNumberOption(key))
    {
        if (savedStore === undefined)
        {
            savedStore = store<number>(defaultval as number);
            staticConfigMap[key] = savedStore;
        }
        return savedStore as WritableStore<number>;
    }
    else
    {
        if (savedStore === undefined)
            {
                savedStore = store<boolean>(defaultval as boolean);
                staticConfigMap[key] = savedStore;
            }
            return savedStore as WritableStore<boolean>;
    }
}