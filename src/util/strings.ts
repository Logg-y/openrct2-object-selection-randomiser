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
    RUN: "Run",
    RANDOMISER_ALREADY_RUNNING: "The randomiser is already running!",

    ERROR_LOAD_FAILED_NULL_RETURN: "Loading an object failed (null return). Make sure you aren't trying to load too many objects of type: {0}",
    ERROR_LOAD_FAILED_OBJECT_SELECTION_OPEN: "Loading an object failed (didn't take). Make sure you don't open the Object Selection window while this is running.",
    ERROR_RESEARCH_ORDERING: "Failed to meet requested stall requirements. This is almost certainly a bug.",
    SAVE:"Save",
    LOAD:"Load",
    CANCEL:"Cancel",
    ARE_YOU_SURE_SAVE: "Are you sure you want to overwrite your saved settings?",
    ARE_YOU_SURE_LOAD: "Are you sure you want to reload your saved settings, overwriting any new changes you made?",

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
    SOURCE_PREFERENCE_EXTHELP: "Source preferences are the percentage chance to consider objects from that{NEWLINE}game. Whenever choosing a new object, a list of all options is built.{NEWLINE}If you have Wacky Worlds set to 10, then there is a 10% chance that the{NEWLINE}list of objects to choose from contains Wacky Worlds' objects{NEWLINE}- the actual chance to get one depends on the total number of objects in the{NEWLINE}list.{NEWLINE}{NEWLINE}This can be set globally (first settings page) or on a per-object basis.",
    SOURCE_PREFERENCE_EXTHELP2: "Note that copying the scenario's distributions may have some slightly{NEWLINE}unexpected results - for instance, many RCT1 scenarios will get RCT2{NEWLINE}weighting from 'updated' objects like the Looping Coaster.",
    SOURCE_PREFERENCE_TOOLTIP: "Control how much certain games' objects appear. This is the percentage chance to even consider the objects as options, rather than a percentage of all objects being tied to each game.",
    USE_SCENARIO_DEFAULT_DISTRIBUTIONS: "Roughly copy scenario's default distributions for {0}",
    USE_SCENARIO_DEFAULT_GLOBAL: "Roughly copy scenario's default distributions averaged across all objects",
    USE_GLOBAL_PREFERENCE: "Use global preference",
    USE_MANUAL_OVERRIDE: "Use manual override",
    OBJECT_DISTRIBUTION_STARTING: "Starting Object Distribution",
    OBJECT_DISTRIBUTION_RESEARCHABLE: "Researchable Object Distribution",
    OBJECT_DISTRIBUTION_GLOBAL: "Global Object Distribution",
    OBJECT_DISTRIBUTION_TOOLTIP: "Governs what proportion of game objects are of what research category.",
    OBJECT_DISTRIBUTION_EXTHELP: "These values are weights that control what proportion of objects fall{NEWLINE}under each category.",
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
    TITLE_SAVE_LOAD_SETTINGS: "{PALEGOLD}Save/Load Settings",
    TITLE_WORKING: "{PALEGOLD}Working...",

    UNPAUSE_WARNING: "The game must be UNPAUSED for this to progress.",

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
    REPLACE_RIDES: "Replace existing rides - {TOPAZ}WARNING: game stability unknown, may ruin existing park rides!",
    REPLACE_PATH_SURFACES: "Replace existing path/queue surface types",
    REPLACE_PATH_SUPPORTS: "Replace existing path railing types",
    REPLACE_PATH_ATTACHMENTS: "Replace existing path attachments",

    FIRST_AVAILABILITY_PROMPT: "{0} first availability: ",
    FIRST_AVAILABILITY_VALUE_ENTRY_PROMPT: "{0} should be available within researching this many stalls: ",
    FIRST_AVAILABILITY_MIMIC_SCENARIO: "Mimic scenario's default",
    FIRST_AVAILABILITY_MIMIC_SCENARIO_IF_AVAILABLE: "Mimic scenario if normally available, else random",
    FIRST_AVAILABILITY_EARLY: "Always make available early in the scenario...",
    FIRST_AVAILABILITY_DISCOVERED: "Always make available at the start of the scenario",
    FIRST_AVAILABILITY_RANDOM: "Random: make choices randomly with no guarantees",
    FIRST_AVAILABILITY_NEVER: "Never (unless already built in park)",
    FOOD_STALL: "Food stall",
    FIRST_AID_STALL: "First aid stall",
    DRINK_STALL: "Drink stall",
    TOILETS: "Toilets",
    CASH_MACHINE: "Cash machine",
    INFO_KIOSK: "Information kiosk",

    UI_ENTER_NUMERIC_VALUE_PROMPT: "Enter a numeric value: ",
    UI_MAX: "Max: ",
    UI_DEFAULT: "Default: ",
    UI_ENTER_VALUE: "Enter Value",
    UI_VALUE_NOT_NUMERIC: "Entered value was not numeric.",

    DISALLOW_COMPATIBILITY_OBJECTS: "Disallow compatibility objects (or duplicates of them)",
    DISALLOW_COMPATIBILITY_OBJECTS_TOOLTIP: "Compatibility objects cannot normally be selected and exist for backwards compatibility with old saved games. This setting also prevents loading the non-compatibility versions of the object if the compatibility objects cannot be unloaded for any reason. Turning this option off will mean some vehicle options can be selected twice.",

    DISALLOW_CLASSIC_VEHICLE_DUPLICATION: "Disallow duplicate ride vehicles on Classic ride types",
    DISALLOW_CLASSIC_VEHICLE_DUPLICATION_TOOLTIP: "This prevents the same kind of ride and vehicles both being loaded at the same time during randomisation, for example the Classic Mini coaster and Junior coaster both get Ladybird trains, and having both available at the same time is a bit pointless.",

    DISALLOW_BOTH_SLOPED_AND_STAIRS: "Disallow both sloped and staired versions of the same path type simultaneously",
    DISALLOW_BOTH_SLOPED_AND_STAIRS_TOOLTIP: "Some path types have two variants: one that gets stairs on sloped tiles, and one with a 'flat' slope. Both look the the same in the path type selector, and it is probably better to have your path type slots used for more variety.",

    DISALLOW_BOTH_ROUNDED_AND_SQUARE: "Disallow both rounded and square versions of the same path type simultaneously",
    DISALLOW_BOTH_ROUNDED_AND_SQUARE_TOOLTIP: "Some path types have two variants: one that has rounded corners, and one which makes square corners. Both look the the same in the path type selector, and it is probably better to have your path type slots used for more variety.",

    DISALLOW_EDITOR_PATH: "Disallow editor-only path types",
    DISALLOW_EDITOR_PATH_TOOLTIP: "Some path types (eg roads) can only be placed in the editor or when using Sandbox mode. If trying to play normally, these use up a path type slot for no real reason.",

    DISALLOW_INVISIBLE_PATH: "Disallow invisible path",
    DISALLOW_INVISIBLE_PATH_TOOLTIP: "Prevents the selection of OpenRCT2's invisible path/queue/supports.",


    LABEL_CLEAR_OLD_SOURCE_PREFERENCES: "Clearing old source preferences...",
    LABEL_LIST_AVAILABLE_OBJECTS: "Looking at all available objects...",
    LABEL_LOAD_ASSOCIATIONS: "Loading associations...",
    LABEL_CHECK_ONE_OFF_INITIAL_STATES: "Checking one-off initial states...",
    LABEL_LOAD_RIDE_DISTRIBUTION_TYPES: "Identifying what types rides are...",
    LABEL_LOAD_NONRIDE_DISTRIBUTION_TYPES: "Loading non-ride types...",
    LABEL_LOAD_SOURCE_PREFERENCE: "Loading source preferences...",
    LABEL_CHECK_STALL_AVAILABILITY: "Looking at default stall availability...",
    LABEL_FORBIDDEN_INDEXES: "Identifying objects that can't be unloaded...",
    LABEL_HANDLE_ASSOCIATIONS_FOR_PRESENT_OBJECTS: "Blacklisting objects that can't coexist with unloadable ones...",
    LABEL_CALCULATE_NUMBER_OBJECTS: "Calculating how many objects of each type to load...",
    LABEL_UNLOAD_UNUSED: "Unloading everything that isn't in use...",
    LABEL_REMOVE_LOADED_FROM_POOLS: "Making sure not to duplicate anything existing...",
    LABEL_LOADING_OBJECTS: "Loading random objects!",
    LABEL_PROCESS_RESEARCH_QUEUE: "Adjusting research queue...",
    LABEL_CLEANUP: "Cleaning up...",
    LABEL_COMPLETE: "Complete!",
    LABEL_FAILED: "Failed.",
    LABEL_ERROR: "Error: {0}",

    RIDE_DISTRIBUTION_TYPES_PROGRESS: "{0} items left...{NEWLINE}This will take much longer if you have many custom ride objects.",
    LOAD_OBJECT_PROGRESS: "{0} items left...",

}