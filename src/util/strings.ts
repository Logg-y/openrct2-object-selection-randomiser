/**
 * @param {string} template A string containing numbered zero-indexed tokens in braces, eg {0}, {1}
 * @param {...string[]} replacements The first element of this array replaces all occurences of {0}, the second replaces all instances of {1}...
 * @return The string with replacements made.
 */
export function formatTokens(template: string, ...replacements: string[])
{
    for (let i=0; i<replacements.length; i++)
    {
        let token = `{${i}}`;
        template = template.replace(token, replacements[i]);
    }
    return template;
}

export const StringTable = {
    PLUGIN_NAME: "Object Selection Randomiser",
    ERROR: "Error",
    OK: "OK",
    RCT1: "RCT1",
    RCT2: "RCT2",
    ADDED_ATTRACTIONS: "Added Attractions: ",
    LOOPY_LANDSCAPES: "Loopy Landscapes: ",
    WACKY_WORLDS: "Wacky Worlds: ",
    TIME_TWISTER: "Time Twister: ",
    OPENRCT2_OFFICIAL: "Official OpenRCT2: ",
    CUSTOM: "Custom: ",

    TRANSPORTRIDE: "Transport rides: ",
    GENTLERIDE: "Gentle rides: ",
    THRILLRIDE: "Thrill rides: ",
    ROLLERCOASTER: "Roller coasters: ",
    WATERRIDE: "Water rides: ",
    FOODSTALL_PROMPT: "Food stalls: ",
    DRINKSTALL_PROMPT: "Drink stalls: ",
    OTHERSTALL: "Other stalls: ",
    ENTER_NUMBER_OBJECTS: "Number of objects: ",

    RIDES_STALLS: "Rides and Stalls",
    PATH_SURFACES: "Path Surfaces",
    PATH_SUPPORTS: "Path Railings",
    BENCHES: "Benches",
    LAMPS: "Lamps",
    PARK_ENTRANCES: "the Park Entrance",

    STARTING_OBJECTS: "starting objects",
    RESEARCHABLE_OBJECTS: "researchable objects",

    SOURCE_PREFERENCE: "Game Source Preferences",
    SOURCE_PREFERENCE_GLOBAL: "Global Game Source Preferences",
    SOURCE_PREFERENCE_EXTHELP: "Source preferences are the percentage chance to consider objects from that game. Every time it is time to choose a new object, a list of all options is built. If you have RCT2 set to 100 and Wacky Worlds set to 10, then there is a 10% chance that the list of objects to choose from contains Wacky Worlds' objects - the actual chance to get one depends on the total number of objects in the list.{NEWLINE}{NEWLINE}This can be set globally (first settings page) or on a per-object basis.",
    SOURCE_PREFERENCE_TOOLTIP: "Control how much certain games' objects appear. This is the percentage chance to even consider the objects as options, rather than a percentage of all objects being tied to each game.",
    USE_SCENARIO_DEFAULT_DISTRIBUTIONS: "Use scenario's default distributions for {0}",
    USE_SCENARIO_DEFAULT_GLOBAL: "Use scenario's default distributions averaged across all objects",
    USE_GLOBAL_PREFERENCE: "Use global preference",
    USE_MANUAL_OVERRIDE: "Use manual override",
    OBJECT_DISTRIBUTION_STARTING: "Starting Object Distribution",
    OBJECT_DISTRIBUTION_RESEARCHABLE: "Researchable Object Distribution",
    OBJECT_DISTRIBUTION_GLOBAL: "Global Object Distribution",
    OBJECT_DISTRIBUTION_TOOLTIP: "Governs what proportion of game objects are of what research category.",
    QUANTITY_SELECTION_STARTING: "Number of starting (already researched) items: ",
    QUANTITY_SELECTION_RESEARCH: "Number of researchable items: ",
    QUANTITY_SELECTION_SCENARIO_DEFAULT: "Copy scenario's default",
    QUANTITY_SELECTION_SCENARIO_DEFAULT_MIN: "Copy scenario's default, as long as it is greater than...",
    QUANTITY_SELECTION_FIXED: "Always use a fixed value...",

    QUANTITY_SELECTION_PATHSURFACE: "Number of non-queue path types: ",
    QUANTITY_SELECTION_PATHSUPPORTS: "Number of path railing types: ",
    QUANTITY_SELECTION_QUEUE: "Number of queue path types: ",
    QUANTITY_SELECTION_BENCHES: "Number of bench types: ",
    QUANTITY_SELECTION_LAMPS: "Number of lamp types: ",
    QUANTITY_SELECTION_BINS: "Number of litter bin types: ", 


    STARTING_SCENERY_RESEARCH_TITLE: "Should these basic scenery items always be available at the start (not behind research)?",
    TREES: "Trees",
    SHRUBS: "Shrubs",
    WALLS_FENCES: "Walls and Fences",
    GARDENS: "Gardens",
    PATH_ATTACHMENTS: "Path Attachments",

    TITLE_MAIN_SETTINGS: "{PALEGOLD}Main Settings",
    TITLE_RESEARCH_SETTINGS: "{PALEGOLD}Research Settings",
    TITLE_RIDE_SETTINGS: "{PALEGOLD}Ride/Stall Settings",
    TITLE_FOOTPATH_SURFACE_SETTINGS: "{PALEGOLD}Footpath/Queue Settings",
    TITLE_FOOTPATH_SUPPORTS_SETTINGS: "{PALEGOLD}Footpath Railings Settings",
    TITLE_PARK_ENTRANCE_SETTINGS: "{PALEGOLD}Park Entrance Settings",
    TITLE_PATH_ATTACHMENT_SETTINGS: "{PALEGOLD}Path Attachment Settings",

    RANDOMISE_OBJECT_TOOLTIP: "Whether or not to randomise the available objects of this type.",
    RANDOMISE_RIDES_STALLS: "Randomise rides and stalls",
    RANDOMISE_PATH_SURFACES: "Randomise path/queue surface types",
    RANDOMISE_PATH_SUPPORTS: "Randomise path railings",
    RANDOMISE_PARK_ENTRANCE: "Randomise park entrance",

    RANDOMISE_BENCHES: "Randomise benches",
    RANDOMISE_BINS: "Randomise litter bins",
    RANDOMISE_LAMPS: "Randomise lamps",

    PATH_ATTACHMENT_ONE_OFF_ALWAYS_AVAILABLE: "Always make available",
    PATH_ATTACHMENT_ONE_OFF_RANDOM_CHANCE: "Always random chance...",
    PATH_ATTACHMENT_ONE_OFF_RANDOM_CHANCE_IF_UNAVAILABLE: "Random chance if not normally available...",

    CHANCE_OF_AVAILABILITY: "Chance of {0} being available: ",

    QUEUE_LINE_TV: "Queue line TV",
    JUMPING_FOUNTAINS: "Jumping fountains",
    JUMPING_SNOWBALLS: "Jumping snowballs",

    REPLACE_OBJECT_TOOLTIP: "If this is enabled, already existing objects in the game world will be swapped out with new ones.",
    REPLACE_STALLS: "Replace existing stalls",
    REPLACE_RIDES: "Replace existing rides - {TOPAZ}WARNING: game stability unknown, will ruin existing park rides!",
    REPLACE_PATH_SURFACES: "Replace existing path/queue surface types",
    REPLACE_PATH_SUPPORTS: "Replace existing path railing types",
    REPLACE_PATH_ATTACHMENTS: "Replace existing path attachments",

    FIRST_AVAILABILITY_PROMPT: "{0} first availability: ",
    FIRST_AVAILABILITY_VALUE_ENTRY_PROMPT: "{0} should be available within researching this many stalls: ",
    FIRST_AVAILABILITY_MIMIC_SCENARIO: "Mimic scenario's default setting",
    FIRST_AVAILABILITY_EARLY: "Always make available early in the scenario...",
    FIRST_AVAILABILITY_RANDOM: "Random: make choices randomly with no guarantees",
    FOOD_STALL: "Food stall",
    FIRST_AID_STALL: "First aid stall",
    DRINK_STALL: "Drink stall",
    TOILETS: "Toilets",
    CASH_MACHINE: "Cash machine",

    UI_ENTER_NUMERIC_VALUE_PROMPT: "Enter a numeric value: ",
    UI_MAX: "Max: ",
    UI_DEFAULT: "Default: ",
    UI_ENTER_VALUE: "Enter Value",
    UI_VALUE_NOT_NUMERIC: "Entered value was not numeric.",
}