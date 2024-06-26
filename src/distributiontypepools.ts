/*
    Sift through the list of objects and sort them into "distribution types" - which correspond to the categories offered on the UI
    Eg an object with ObjectType "ride" could be any kind of ride OR a stall, we need to work out what it is and keep lists of what there is for the worker

    This makes for quite a lot of cumbersome mapping and back-and-forths between the distribution and the API's ObjectType, which I think is probably unavoidable, unless
    I can think of a better way to structure all this. In the end, objects are originally their API type and we need their API type to pass to the object manager to load anything
    and handle indexes which makes it seem like getting rid of this is probably impossible.
*/

import { ObjectAssociations } from "./objectassociation";
import { ObjectIdentifierToInstalledObject } from "./installedobjectlist";
import { PregeneratedIdentifierToRideResearchCategory } from "./standardobjectlist";
import { log } from "./util/log";
import { randomiserProgressText } from "./mainworker";
import { StringTable, formatTokens } from "./util/strings";

export const RideObjectDistributionTypes = ["transport", "gentle", "thrill", "water", "rollercoaster", "foodstall", "drinkstall", "otherstall"] as const;
export type RideObjectDistributionType = typeof RideObjectDistributionTypes[number];

export const NonRideObjectDistributionTypes = ["bin", "lamp", "bench", "park_entrance", "nonqueue_surface", "queue_surface", "footpath_railings"] as const;
export type NonRideObjectDistributionType = typeof NonRideObjectDistributionTypes[number];

export type ObjectDistributionType = RideObjectDistributionType | NonRideObjectDistributionType;
export const ObjectDistributionTypes: ObjectDistributionType[] = ["transport", "gentle", "thrill", "water", "rollercoaster", "foodstall", "drinkstall", "otherstall", "bin", "lamp", "bench", "park_entrance", "nonqueue_surface", "queue_surface", "footpath_railings"] as const;

const ShopItemToStallType: Record<number, RideObjectDistributionType> = {
    0:"otherstall",// Balloon
    1:"otherstall",// Toy,
    2:"otherstall",// Map,
    3:"otherstall",// Photo,
    4:"otherstall",// Umbrella,
    5:"drinkstall",// Drink,
    6:"foodstall",// Burger,
    7:"foodstall",// Chips,
    8:"foodstall",// IceCream,
    9:"foodstall",// Candyfloss,
    // EmptyCan,
    // Rubbish,
    // EmptyBurgerBox,
    13:"foodstall",// Pizza,
    // Voucher,
    15:"foodstall",// Popcorn,
    16:"foodstall",// HotDog,
    17:"foodstall",// Tentacle,
    18:"otherstall",// Hat,
    19:"foodstall",// ToffeeApple,
    20:"otherstall",// TShirt,
    21:"foodstall",// Doughnut,
    22:"drinkstall",// Coffee,
    // EmptyCup,
    24:"foodstall",// Chicken,
    25:"drinkstall",// Lemonade,
    // EmptyBox,
    // EmptyBottle = 27,
    // Admission = 31,
    // Photo2 = 32,
    // Photo3,
    // Photo4,
    35:"foodstall",// Pretzel,
    36:"drinkstall",// Chocolate,
    37:"drinkstall",// IcedTea,
    38:"foodstall",// FunnelCake,
    39:"otherstall",// Sunglasses,
    40:"foodstall",// BeefNoodles,
    41:"foodstall",// FriedRiceNoodles,
    42:"foodstall",// WontonSoup,
    43:"foodstall",// MeatballSoup,
    44:"drinkstall",// FruitJuice,
    45:"drinkstall",// SoybeanMilk,
    46:"drinkstall",// Sujeonggwa,
    47:"foodstall",// SubSandwich,
    48:"foodstall",// Cookie,
    // EmptyBowlRed,
    // EmptyDrinkCarton,
    // EmptyJuiceCup,
    52:"foodstall", // RoastSausage,
    // EmptyBowlBlue,
    255:"otherstall" // None
} as const;


// It seems bonkers that only way I can see to get what kind of ride a RideObject is
// is to load it and see what kind of RideResearchItem gets added to park.research.inventedItems
// but here we are.

let loadDistributionTypesWorkingList: string[] = [];
// Unsurprisingly, repeatedly loading/unloading objects isn't fast and we have to do it pretty slowly
const RIDE_DISTRIBUTION_TYPES_TO_CHECK_PER_TICK = 2;

export let RideTypeToStallIdentifiers: Record<number, string[]> = {};

// We have to save them, but this is useful anyway for the non-rides
export let ObjectIdentifierToRideDistributionType: Record<string, RideObjectDistributionType> = {};
// I will still need to maintain this lookup even if the plugin API is improved though
export let ObjectPoolByDistributionType: Record<ObjectDistributionType, string[]> =
{
    bench:[],
    bin:[],
    drinkstall:[],
    foodstall:[],
    footpath_railings:[],
    queue_surface:[],
    nonqueue_surface: [],
    gentle:[],
    lamp:[],
    otherstall:[],
    park_entrance:[],
    rollercoaster:[],
    thrill:[],
    transport:[],
    water:[],
}

export const ObjectDistributionTypeToAPIObjectType: Record<ObjectDistributionType, ObjectType> =
{
    bench:"footpath_addition",
    bin:"footpath_addition",
    drinkstall:"ride",
    foodstall:"ride",
    footpath_railings:"footpath_railings",
    gentle:"ride",
    lamp:"footpath_addition",
    nonqueue_surface:"footpath_surface",
    otherstall:"ride",
    park_entrance:"park_entrance",
    queue_surface:"footpath_surface",
    rollercoaster:"ride",
    thrill:"ride",
    transport:"ride",
    water:"ride",
} as const;

let objectsLoadedThisTick = 0;

export function loadDistributionTypesForAllRides()
{
    objectsLoadedThisTick = 0;
    if (loadDistributionTypesWorkingList.length == 0)
    {
        loadDistributionTypesWorkingList = Object.keys(ObjectIdentifierToInstalledObject);
    }
    while (true)
    {
        let ident = loadDistributionTypesWorkingList.pop();
        if (ident == undefined) break;
        let obj = ObjectIdentifierToInstalledObject[ident];
        if (obj.type == "ride")
        {
            getDistributionTypeForRide(obj);
        }
        if (objectsLoadedThisTick > RIDE_DISTRIBUTION_TYPES_TO_CHECK_PER_TICK)
        {
            log(`Load ride distribution types: ${loadDistributionTypesWorkingList.length} items left`, "info");
            randomiserProgressText.set(formatTokens(StringTable.RIDE_DISTRIBUTION_TYPES_PROGRESS, String(loadDistributionTypesWorkingList.length)));
            return false;
        }
    }
    return loadDistributionTypesWorkingList.length == 0;
}

export function clearDistributionTypes()
{
    ObjectIdentifierToRideDistributionType = {};
    ObjectPoolByDistributionType = {
        bench:[],
        bin:[],
        drinkstall:[],
        foodstall:[],
        footpath_railings:[],
        queue_surface:[],
        nonqueue_surface: [],
        gentle:[],
        lamp:[],
        otherstall:[],
        park_entrance:[],
        rollercoaster:[],
        thrill:[],
        transport:[],
        water:[],
    };
    RideTypeToStallIdentifiers = {};
    return true;
}

var checkedLoadedObjectDistributions = false;

function logDistributionTypeFromResearchItem(obj: RideResearchItem)
{
    let rideObj = objectManager.getObject("ride", obj.object);
    if (rideObj === null)
    {
        log(`logDistributionTypeFromResearchItem: Failed to get the ride object corresponding to research item ${JSON.stringify(obj)}`, "error");
        return;
    }
    let category: RideObjectDistributionType;
    if (obj.category == "shop")
    {
        let shopItemCategory = ShopItemToStallType[rideObj.shopItem]
        if (shopItemCategory === undefined)
        {
            log(`Unknown stall category for shop item ${rideObj.shopItem}, assumed ${rideObj.identifier} is an 'other' stall`, "error");
            category = "otherstall";
        }
        else
        {
            category = shopItemCategory;
        }
        if (RideTypeToStallIdentifiers[obj.rideType] === undefined)
            RideTypeToStallIdentifiers[obj.rideType] = [];
        RideTypeToStallIdentifiers[obj.rideType].push(rideObj.identifier);
    }
    else
    {
        category = obj.category;
    }
    //log(`Dist type for ${rideObj.identifier} = ${category}`, "info");
    let newKey = `${rideObj.identifier}`;
    ObjectIdentifierToRideDistributionType[newKey] = category;
    addIdentifierToDistributionPool(newKey);
}

function findDistributionTypesForAllCurrentlyLoadedRides()
{
    if (!checkedLoadedObjectDistributions)
    {
        let queue = park.research.uninventedItems.concat(park.research.inventedItems);
        log(`Get distribution types for already loaded items first: ${queue.length} items`, "info");
        for (const obj of queue)
        {
            if (obj.type == "ride")
            {
                logDistributionTypeFromResearchItem(obj);
            }
        }
        log(`Finished distribution types for loaded items`, "info");
    }
    checkedLoadedObjectDistributions = true;
}

export function getDistributionTypeForRide(obj: InstalledObject): RideObjectDistributionType | null
{
    if (obj.type != "ride")
    {
        log(`Tried to get ride distribution type for ${obj.identifier} but it isn't a ride`, "error");
        return null;
    }
    // When we load an object via objectManager.load, it gets put into the last slot of the discovered items array
    // and the RideResearchItem contains the category, which we can read...
    // and then unload the object!

    // Check everything already loaded, then we can assume that everything we load to test wasn't already loaded
    // and so we don't have to handle that any more
    findDistributionTypesForAllCurrentlyLoadedRides();
    if (ObjectIdentifierToRideDistributionType[obj.identifier] !== undefined)
    {
        return ObjectIdentifierToRideDistributionType[obj.identifier];
    }
    // Shops still need to check the sold item category
    // I could pregen this as well, but just getting all the non-stall rides out of the way makes this take so little time that it doesn't seem hugely worth it
    let pregeneratedCategory = PregeneratedIdentifierToRideResearchCategory[obj.identifier];
    if (pregeneratedCategory !== undefined && pregeneratedCategory != "shop")
    {
        ObjectIdentifierToRideDistributionType[obj.identifier] = pregeneratedCategory;
        addIdentifierToDistributionPool(obj.identifier);
        return pregeneratedCategory;
    }
    log(`Loading ${obj.identifier} to get its research item type...`, "info");
    objectsLoadedThisTick++;
    let loadReturn = objectManager.load(obj.identifier);
    if (loadReturn === null)
    {
        log(`Tried to load ${obj.identifier} to get its research item type, but the load failed`, "error");
        return null;
    }
    // This normally loads things as invented items.
    // I don't know why, but the attempts to load random objects come uninvented instead - and that's a bit worrying
    for (let listIndex=0; listIndex<2; listIndex++)
    {
        let thisList: "inventedItems" | "uninventedItems" = listIndex == 0 ? "inventedItems" : "uninventedItems";
        // This SHOULD put it at the end of discovered items, but we can't necessarily assume that
        let searchIndex = park.research[thisList].length - 1;
        while (searchIndex >= 0)
        {
            
            let researchItem = park.research[thisList][searchIndex];
            if (researchItem.type == "ride")
            {
                if (researchItem.object == loadReturn.index)
                {
                    logDistributionTypeFromResearchItem(researchItem);
                    break;
                }
            }
            searchIndex--;
        }
        if (searchIndex < 0)
        {
            continue;
        }
        objectManager.unload(obj.identifier);
        // We also have to remove it from invented items, or the invented items list gets messed up
        // - the added entires are not removed at unload, and we end up with a ton of research items
        //  for different ride types all pointing at the index we are repeatedly loading every object in the game into
        park.research[thisList] = park.research[thisList].filter((obj) => {return !(obj.object == loadReturn.index && obj.type=="ride")});
        return ObjectIdentifierToRideDistributionType[obj.identifier];
    }
    log(`Tried to load ${obj.identifier} to get its research item type, but didn't find it in either research list`, "error");
    return null;
}

// Non-ride stuff below here:

const NON_RIDE_DISTRIBUTION_TYPES_TO_CHECK_PER_TICK = 200;

export function getDistributionTypeForNonRide(obj: InstalledObject): NonRideObjectDistributionType | null
{
    if (obj.type == "ride")
    {
        log(`Tried to get nonride distribution type for ${obj.identifier} but it is a ride`, "error");
        return null;
    }
    
    if (obj.type == "park_entrance" || obj.type == "footpath_railings")
    {
        return obj.type as NonRideObjectDistributionType;
    }
    else if (obj.type == "footpath_surface")
    {
        if (obj.identifier.indexOf("queue") > -1)
        {
            return "queue_surface";
        }
        else
        {
            return "nonqueue_surface";
        }
    }
    else if (obj.type == "footpath_addition")
    {
        if (obj.identifier.indexOf("bench") > -1)
        {
            return "bench";
        }
        else if (obj.identifier.indexOf("lamp") > -1)
        {
            return "lamp";
        }
        else if (obj.identifier.indexOf("litter") > -1)
        {
            return "bin";
        }
        else
        {
            log(`Didn't know how to categorise path addition ${obj.identifier} = ${obj.name}`, "info");
            return null;
        }
    }
    log(`Tried to get nonride distribution type: obj ${obj.identifier} has unhandled type ${obj.type}`, "error");
    return null;
}

export function loadDistributionTypesForAllNonRides()
{
    if (loadDistributionTypesWorkingList.length == 0)
    {
        let installedObjList = objectManager.installedObjects.filter((obj) => obj.type === "footpath_addition" || obj.type === "park_entrance" || obj.type == "footpath_surface" || obj.type == "footpath_railings");
        loadDistributionTypesWorkingList = installedObjList.map((obj: InstalledObject) => obj.identifier);
    }
    let listForThisTick = loadDistributionTypesWorkingList.splice(0, NON_RIDE_DISTRIBUTION_TYPES_TO_CHECK_PER_TICK);
    for (const ident of listForThisTick)
    {
        addIdentifierToDistributionPool(ident);
    }
    log(`Load non-ride distribution types: ${loadDistributionTypesWorkingList.length} items left`, "info");
    if (loadDistributionTypesWorkingList.length == 0)
    {
        return true;
    }
    return false;
}

export function getDistributionTypeForObject(obj: InstalledObject)
{
    let distType: ObjectDistributionType | null;
    if (obj.type == "ride")
    {
        distType = ObjectIdentifierToRideDistributionType[obj.identifier];
    }
    else
    {
        distType = getDistributionTypeForNonRide(obj);
    }
    return distType
}

export function addIdentifierToDistributionPool(identifier: string)
{
    let installedObject = ObjectIdentifierToInstalledObject[identifier];
    if (installedObject !== undefined)
    {
        let distType = getDistributionTypeForObject(installedObject);
        if (distType !== null)
        {
            let association = ObjectAssociations[identifier];
            if (association === undefined || !association.blacklisted)
            {
                if (ObjectPoolByDistributionType[distType].indexOf(identifier) > -1)
                {
                    // This is okay. I start out with everything nonblacklisted being in a pool, and then unload everything that's in the
                    // scenario by default - which promptly tries to add it again
                    // The important thing is that this doesn't get to succeed
                }
                else
                {
                    ObjectPoolByDistributionType[distType].push(identifier);
                }
            }
        }
    }
}