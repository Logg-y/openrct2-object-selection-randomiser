import { QuantitySelectionPrefix } from "./numberofobjects";
import { randomise } from "./mainworker";
import { ConfigOptionNumber, getDynamicStore, getStaticStore, loadFromSharedStorage, saveToSharedStorage } from "./sharedstorage";
import { GameSourcesArray, SourcePreferenceKey } from "./sourcepreference";
import { pluginVersion } from "./util/pluginversion";
import { StringTable, formatTokens } from "./util/strings";
import { storedCheckbox, getNonpersistentStore, messageBox, yesNoBox } from "./util/uiinclude";
import { tab, tabwindow, label, groupbox, horizontal, button, dropdown, twoway, SpinnerParams, TwoWayBinding, spinner, WritableStore, ElementVisibility, vertical } from "openrct2-flexui";
import { RideObjectDistributionTypes, RideObjectDistributionType } from "./distributiontypepools";
import { UIRandomiserInProgress } from "./uirunning";

const SourceGameToPromptString: Record<ObjectSourceGame, string> =
{
    rct1: StringTable.RCT1,
    rct2: StringTable.RCT2,
    added_attractions: StringTable.ADDED_ATTRACTIONS,
    loopy_landscapes: StringTable.LOOPY_LANDSCAPES,
    wacky_worlds: StringTable.WACKY_WORLDS,
    time_twister: StringTable.TIME_TWISTER,
    openrct2_official: StringTable.OPENRCT2_OFFICIAL,
    custom: StringTable.CUSTOM,
};

const ObjectDistributionTypeToPromptString: Record<RideObjectDistributionType, string> =
{
    drinkstall: StringTable.DRINKSTALL_PROMPT,
    foodstall: StringTable.FOODSTALL_PROMPT,
    otherstall: StringTable.OTHERSTALL,
    transport: StringTable.TRANSPORTRIDE,
    gentle: StringTable.GENTLERIDE,
    rollercoaster: StringTable.ROLLERCOASTER,
    water: StringTable.WATERRIDE,
    thrill: StringTable.THRILLRIDE,
}

interface SpinnerPlusSetterParams extends SpinnerParams
{
    value: TwoWayBinding<number>,
    defaultvalue: number,
    minimum?: number,
    maximum?: number,
    prompt: string,
    width: number,
}

// Functions to call when the UI opens, allows fixing visibility based on the saved settings
// which are not known when we create the structure
let callOnLoadedStores: (()=>void)[] = [];

export function spinnerPlusSetter(params: SpinnerPlusSetterParams)
{
    let setValueButton = button({
        text: "...",
        height: 14,
        width: 14,
        visibility: params.visibility,
        onClick: () => {
            let rangeString = "";
            if (params.minimum !== undefined)
            {
                if (params.maximum === undefined)
                {
                    rangeString = `(${params.minimum}+)`
                }
                else
                {
                    rangeString = `(${params.minimum} - ${params.maximum})`;
                }
            }
            else if (params.maximum !== undefined)
            {
                rangeString = `(${StringTable.UI_MAX} ${params.maximum})`;
            }
            let desc = StringTable.UI_ENTER_NUMERIC_VALUE_PROMPT;
            if (rangeString != "")
            {
                desc = desc + `{NEWLINE}${rangeString}`;
            }
            desc = desc + `{NEWLINE}${StringTable.UI_DEFAULT}${params.defaultvalue}`;
            ui.showTextInput(
                {
                    title: StringTable.UI_ENTER_VALUE,
                    description: desc,
                    initialValue: String(params.value.twoway.get()),
                    callback: (value: string) =>
                    {
                        let numeric = Number(value);
                        if (isNaN(numeric))
                        {
                            ui.showError(StringTable.ERROR, StringTable.UI_VALUE_NOT_NUMERIC);
                            return;
                        }
                        if (params.minimum !== undefined)
                        {
                            numeric = Math.max(numeric, params.minimum);
                        }
                        if (params.maximum !== undefined)
                        {
                            numeric = Math.min(numeric, params.maximum);
                        }
                        params.value.twoway.set(numeric);
                    }
                }
            )
        }
    });

    // Make the spinner box narrower if there's an extended help ? button
    // this makes columns of these widgets all align neatly which looks way nicer
    let actualWidth = params.width;

    let promptLabel = label({
        text: params.prompt,
        tooltip: params.tooltip,
        visibility: params.visibility
    });

    let spinnerObject = spinner({
        ...params,
        width: actualWidth,
    });

    return horizontal([
        promptLabel,
        setValueButton,
        spinnerObject,
    ]);
}

interface SourcePreferenceWidgetParams
{
    storeprefix: SourcePreferenceKey,
    objectTypeString: string,
    includeGlobal: boolean,
}


function sourcePreferenceWidget(params: SourcePreferenceWidgetParams)
{
    let dropdownItems = [];
    if (params.includeGlobal)
    {
        dropdownItems.push(StringTable.USE_GLOBAL_PREFERENCE);
        dropdownItems.push(formatTokens(StringTable.USE_SCENARIO_DEFAULT_DISTRIBUTIONS, params.objectTypeString));
    }
    else
    {
        dropdownItems.push(StringTable.USE_SCENARIO_DEFAULT_GLOBAL);
    }
    dropdownItems.push(StringTable.USE_MANUAL_OVERRIDE);
    let dropdownStore = getDynamicStore(params.storeprefix+"SourcePreferenceDropdown", 0);
    let children: WritableStore<ElementVisibility>[] = [];
    for (const game of GameSourcesArray)
    {
        children.push(getNonpersistentStore<ElementVisibility>(params.storeprefix+"SourcePreferenceSpinnerDisabled"+game, "none"));
    }
    let dropdownChange = (val: number) =>
    {
        let visible = val == (params.includeGlobal ? 2 : 1);
        let state: ElementVisibility = visible ? "visible" : "none";
        for (const child of children)
        {
            child.set(state);
        }
    }
    callOnLoadedStores.push(()=>dropdownChange(dropdownStore.get()));
    let content = [horizontal({
        content: [
            dropdown({
            items: dropdownItems,
            selectedIndex: twoway(dropdownStore),
            onChange: dropdownChange,
            }),
            button({
                text: "?",
                border: true,
                height: 14,
                width: 14,
                onClick: () => messageBox(
                    {
                        text: [StringTable.SOURCE_PREFERENCE_EXTHELP, StringTable.SOURCE_PREFERENCE_EXTHELP2],
                        height: 200,
                    }),
            })
        ]
    })];
    let spinners = [];
    for (const game of GameSourcesArray)
    {
        spinners.push(spinnerPlusSetter({
            value: twoway(getDynamicStore(params.storeprefix+"SourcePreferenceWeight"+game, 100)),
            defaultvalue: 100,
            maximum: 100,
            minimum: 0,
            step: 5,
            width: 60,
            prompt: SourceGameToPromptString[game],
            visibility: getNonpersistentStore<ElementVisibility>(params.storeprefix+"SourcePreferenceSpinnerDisabled"+game, "none"),
        }));
        if (spinners.length >= 3)
        {
            content.push(horizontal({content: spinners}));
            spinners = [];
        }
    }
    if (spinners.length > 0)
    {
        let extraItems = 3 - spinners.length;
        while (extraItems > 0)
        {
            spinners.push(label({text:""}));
            extraItems--;
        }
        content.push(horizontal({content: spinners}));
    }


    return groupbox({
        content: content,
        text: params.includeGlobal ? StringTable.SOURCE_PREFERENCE : StringTable.SOURCE_PREFERENCE_GLOBAL,
        tooltip: StringTable.SOURCE_PREFERENCE_TOOLTIP,
    })
}

interface ObjectDistributionWidgetParams
{
    storeprefix: "global",
    groupboxTitle: string,
    objectTypeString: string,
    includeGlobal: boolean,
}  

function objectDistributionWidget(params: ObjectDistributionWidgetParams)
{
    let dropdownItems = [];
    if (params.includeGlobal)
    {
        dropdownItems.push(StringTable.USE_GLOBAL_PREFERENCE);
        dropdownItems.push(formatTokens(StringTable.USE_SCENARIO_DEFAULT_DISTRIBUTIONS, params.objectTypeString));
    }
    else
    {
        dropdownItems.push(StringTable.USE_SCENARIO_DEFAULT_GLOBAL);
    }
    dropdownItems.push(StringTable.USE_MANUAL_OVERRIDE);
    let dropdownStore = getDynamicStore(params.storeprefix+"ObjectDistributionDropdown", 0);

    let children: WritableStore<ElementVisibility>[] = [];
    for (const category of RideObjectDistributionTypes)
    {
        children.push(getNonpersistentStore<ElementVisibility>(params.storeprefix+"ObjectDistributionSpinnerDisabled"+category, "none"));
    }
    let dropdownChange = (val: number) =>
    {
        let visible = val == (params.includeGlobal ? 2 : 1);
        let state: ElementVisibility = visible ? "visible" : "none";
        for (const child of children)
        {
            child.set(state);
        }
    }
    callOnLoadedStores.push(()=>dropdownChange(dropdownStore.get()));
    let content = [horizontal({
            content: [
                dropdown({
                items: dropdownItems,
                selectedIndex: twoway(dropdownStore),
                onChange: dropdownChange,
                }),
                button({
                    text: "?",
                    border: true,
                    height: 14,
                    width: 14,
                    onClick: () => messageBox(
                        {
                            text: StringTable.OBJECT_DISTRIBUTION_EXTHELP,
                            height: 200,
                        }),
                })
            ]
    })];
    let spinners = [];
    for (const category of RideObjectDistributionTypes)
    {
        spinners.push(spinnerPlusSetter({
            value: twoway(getDynamicStore(params.storeprefix+"ObjectDistributionWeight"+category, 5)),
            defaultvalue: 5,
            maximum: 100,
            minimum: 0,
            step: 1,
            width: 60,
            prompt: ObjectDistributionTypeToPromptString[category],
            visibility: getNonpersistentStore<ElementVisibility>(params.storeprefix+"ObjectDistributionSpinnerDisabled"+category, "none"),
        }))
        if (spinners.length >= 3)
        {
            content.push(horizontal({content: spinners}));
            spinners = [];
        }
    }
    if (spinners.length > 0)
    {
        let extraItems = 3 - spinners.length;
        while (extraItems > 0)
        {
            spinners.push(label({text:""}));
            extraItems--;
        }
        content.push(horizontal({content: spinners}));
    }


    return groupbox({
        content: content,
        text: params.groupboxTitle,
        tooltip: StringTable.OBJECT_DISTRIBUTION_TOOLTIP,
    })
}

interface QuantitySelectionWidgetParams
{
    storeprefix: QuantitySelectionPrefix,
    prompt: string,
    defaultvalue: number,
}

function quantitySelectionWidget(params: QuantitySelectionWidgetParams)
{
    let dropdownItems = [StringTable.QUANTITY_SELECTION_SCENARIO_DEFAULT, StringTable.QUANTITY_SELECTION_SCENARIO_DEFAULT_MIN, StringTable.QUANTITY_SELECTION_FIXED];
    let dropdownStore = getDynamicStore(params.storeprefix+"QuantitySelection", 0);

    let spinnerVisibilty = getNonpersistentStore<ElementVisibility>(params.storeprefix+"QuantitySelectionSpinnerDisabled", "none");
    let dropdownChange = (val: number) =>
    {
        let visible = val > 0;
        let state: ElementVisibility = visible ? "visible" : "none";
        spinnerVisibilty.set(state);
    }
    callOnLoadedStores.push(()=>dropdownChange(dropdownStore.get()));
    let content = [horizontal({
            content: [
                label({text: params.prompt}),
                dropdown({
                items: dropdownItems,
                selectedIndex: twoway(dropdownStore),
                onChange: dropdownChange,
                }),
            ]
    })];
    content.push(spinnerPlusSetter({
        value: twoway(getDynamicStore(params.storeprefix+"QuantitySelectionValue", params.defaultvalue)),
        defaultvalue: params.defaultvalue,
        maximum: 1000,
        minimum: 1,
        step: 1,
        width: 60,
        prompt: StringTable.ENTER_NUMBER_OBJECTS,
        visibility: getNonpersistentStore<ElementVisibility>(params.storeprefix+"QuantitySelectionSpinnerDisabled", "none"),
    }))
    return vertical({
        content: content
    });
}

const MainTab = [
    label({text:StringTable.TITLE_MAIN_SETTINGS}),
    sourcePreferenceWidget({
        storeprefix:"global", 
        objectTypeString:"",
        includeGlobal:false
    }),
    objectDistributionWidget({
        storeprefix:"global",
        groupboxTitle:StringTable.OBJECT_DISTRIBUTION_GLOBAL,
        objectTypeString:"",
        includeGlobal:false
    }),
    /*
    objectDistributionWidget({
        storeprefix:"Starting",
        groupboxTitle:StringTable.OBJECT_DISTRIBUTION_STARTING,
        objectTypeString:StringTable.STARTING_OBJECTS,
        includeGlobal:true,
    }),
    */
    storedCheckbox({
        storekey: "AssociationRuleBlacklistCompatibilityObjects",
        defaultvalue: 1,
        prompt: StringTable.DISALLOW_COMPATIBILITY_OBJECTS,
        tooltip: StringTable.DISALLOW_COMPATIBILITY_OBJECTS_TOOLTIP,
    }),
    button(
    {
        text:StringTable.RUN,
        onClick: ()=>
        {
            if (randomise())
            {
                UISettingsTemplate.close();
                UIRandomiserInProgress();
            }
        },
        height:25,
    }
   )
]


const ResearchTab = [
    label({text:StringTable.TITLE_RESEARCH_SETTINGS}),
    quantitySelectionWidget({
        storeprefix:"Starting",
        prompt: StringTable.QUANTITY_SELECTION_STARTING,
        defaultvalue: 30,
    }),
    quantitySelectionWidget({
        storeprefix:"Researchable",
        prompt: StringTable.QUANTITY_SELECTION_RESEARCH,
        defaultvalue: 100,
    }),
    /*
    objectDistributionWidget({
        storeprefix:"Researchable",
        groupboxTitle:StringTable.OBJECT_DISTRIBUTION_RESEARCHABLE,
        objectTypeString:StringTable.RESEARCHABLE_OBJECTS,
        includeGlobal:true}),
    */
   // Before I experienced the world of scenery research not updating the palette, I intended to be able to mess with these
   // Now, I'm not sure it's safe to do so, and I'm not sure how many people would find it very fun to have some of these things taken away from you
   /*
    groupbox({
        content: [
            storedCheckbox({
                storekey: "PathAttachmentsAlwaysAvailable",
                prompt: StringTable.PATH_ATTACHMENTS,
                defaultvalue: 1
            }),
            storedCheckbox({
                storekey: "TreesAlwaysAvailable",
                prompt: StringTable.TREES,
                defaultvalue: 1
            }),
            storedCheckbox({
                storekey: "ShrubsAlwaysAvailable",
                prompt: StringTable.SHRUBS,
                defaultvalue: 1
            }),
            storedCheckbox({
                storekey: "GardensAlwaysAvailable",
                prompt: StringTable.GARDENS,
                defaultvalue: 1
            }),
            storedCheckbox({
                storekey: "FencesWallsAlwaysAvailable",
                prompt: StringTable.WALLS_FENCES,
                defaultvalue: 1
            }),
        ],
        text: StringTable.STARTING_SCENERY_RESEARCH_TITLE,
    })
    */
]

interface FirstAvailabilityWidgetOptions
{
    dropdownkey: ConfigOptionNumber,
    spinnerkey: ConfigOptionNumber,
    objectTypeName: string,
}

function ridesTabFirstAvailability(params: FirstAvailabilityWidgetOptions)
{
    let dropdownItems = [StringTable.FIRST_AVAILABILITY_MIMIC_SCENARIO, StringTable.FIRST_AVAILABILITY_MIMIC_SCENARIO_IF_AVAILABLE, StringTable.FIRST_AVAILABILITY_DISCOVERED, StringTable.FIRST_AVAILABILITY_EARLY, StringTable.FIRST_AVAILABILITY_RANDOM, StringTable.FIRST_AVAILABILITY_NEVER];
    let dropdownStore = getStaticStore(params.dropdownkey, 0);

    let spinnerVisibilty = getNonpersistentStore<ElementVisibility>("FirstAvailabilitySpinnerVisibility" + params.objectTypeName, "none");
    let dropdownChange = (val: number) =>
    {
        let visible = val == 3;
        let state: ElementVisibility = visible ? "visible" : "none";
        spinnerVisibilty.set(state);
    }
    dropdownChange(dropdownStore.get());
    let content = [horizontal({
            content: [
                label({text: formatTokens(StringTable.FIRST_AVAILABILITY_PROMPT, params.objectTypeName)}),
                dropdown({
                items: dropdownItems,
                selectedIndex: twoway(dropdownStore),
                onChange: dropdownChange,
                }),
            ]
    })];
    callOnLoadedStores.push(()=>dropdownChange(dropdownStore.get()));
    content.push(spinnerPlusSetter({
        value: twoway(getStaticStore(params.spinnerkey, 5)),
        defaultvalue: 5,
        maximum: 1000,
        minimum: 0,
        step: 1,
        width: 60,
        prompt: formatTokens(StringTable.FIRST_AVAILABILITY_VALUE_ENTRY_PROMPT, params.objectTypeName),
        visibility: getNonpersistentStore<ElementVisibility>("FirstAvailabilitySpinnerVisibility" + params.objectTypeName, "none"),
    }))
    return vertical({
        content: content
    });
}   

const RidesTab = [
    label({text:StringTable.TITLE_RIDE_SETTINGS}),
    storedCheckbox({
        storekey: "RandomiseRidesStalls",
        prompt: StringTable.RANDOMISE_RIDES_STALLS,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    sourcePreferenceWidget({
        storeprefix:"ride", 
        objectTypeString:StringTable.RIDES_STALLS,
        includeGlobal:true
    }),
    storedCheckbox({
        storekey: "RideReplaceExistingObjects",
        prompt: StringTable.REPLACE_RIDES,
        tooltip: StringTable.REPLACE_OBJECT_TOOLTIP,
        defaultvalue: 0
    }),
    storedCheckbox({
        storekey: "StallReplaceExistingObjects",
        prompt: StringTable.REPLACE_STALLS,
        tooltip: StringTable.REPLACE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "AssociationRulePreventRideAndVehicleClassicDuplication",
        defaultvalue: 1,
        prompt: StringTable.DISALLOW_CLASSIC_VEHICLE_DUPLICATION,
        tooltip: StringTable.DISALLOW_CLASSIC_VEHICLE_DUPLICATION_TOOLTIP,
    }),
    ridesTabFirstAvailability({
        dropdownkey: "FoodStallAvailabilityCategory",
        spinnerkey: "FoodStallAvailabilityEarliness",
        objectTypeName: StringTable.FOOD_STALL,
    }),
    ridesTabFirstAvailability({
        dropdownkey: "DrinkStallAvailabilityCategory",
        spinnerkey: "DrinkStallAvailabilityEarliness",
        objectTypeName: StringTable.DRINK_STALL,
    }),
    ridesTabFirstAvailability({
        dropdownkey: "ToiletAvailabilityCategory",
        spinnerkey: "ToiletAvailabilityEarliness",
        objectTypeName: StringTable.TOILETS,
    }),
    ridesTabFirstAvailability({
        dropdownkey: "CashMachineAvailabilityCategory",
        spinnerkey: "CashMachineAvailabilityEarliness",
        objectTypeName: StringTable.CASH_MACHINE,
    }),
    ridesTabFirstAvailability({
        dropdownkey: "FirstAidAvailabilityCategory",
        spinnerkey: "FirstAidAvailabilityEarliness",
        objectTypeName: StringTable.FIRST_AID_STALL,
    }),
    ridesTabFirstAvailability({
        dropdownkey: "InfoKioskAvailabilityCategory",
        spinnerkey: "InfoKioskAvailabilityEarliness",
        objectTypeName: StringTable.INFO_KIOSK,
    }),
]


const SaveLoadTab = [
	label({
		text: StringTable.TITLE_SAVE_LOAD_SETTINGS,
	}),
	horizontal([
		button({
			text: StringTable.SAVE,
			height: 20,
			onClick: () => {
				yesNoBox(
					{
						text: StringTable.ARE_YOU_SURE_SAVE,
						yesbuttontext: StringTable.OK,
						nobuttontext: StringTable.CANCEL,
						title: StringTable.SAVE,
						yesCallback: saveToSharedStorage,
					}
				)
			}
		}),	
		button({
			text: StringTable.LOAD,
			height: 20,
			onClick: () => {
				yesNoBox(
					{
						text: StringTable.ARE_YOU_SURE_LOAD,
						yesbuttontext: StringTable.OK,
						nobuttontext: StringTable.CANCEL,
						title: StringTable.LOAD,
						yesCallback: loadFromSharedStorage,
					}
				)
			}
		}),	
	])
]

const tabImageGears: ImageAnimation =
{
    frameBase: 5201,
    frameCount: 4,
    frameDuration: 2,
}

const tabImageResearch: ImageAnimation =
{
    frameBase: 5327,
    frameCount: 8,
    frameDuration: 2,
}

const tabImageRides: ImageAnimation =
{
    frameBase: 5442,
    frameCount: 16,
    frameDuration: 3,
}

const tabImageSaveLoad: ImageAnimation =
{
	frameBase: 5183,
	frameCount: 1,
	frameDuration: 1,
	offset: { x: 3, y: 1 }
}


const FootpathSurfaceTab = [
    label({text:StringTable.TITLE_FOOTPATH_SURFACE_SETTINGS}),
    storedCheckbox({
        storekey: "RandomisePathSurfaces",
        prompt: StringTable.RANDOMISE_PATH_SURFACES,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    sourcePreferenceWidget({
        storeprefix:"footpath_surface", 
        objectTypeString:StringTable.PATH_SURFACES,
        includeGlobal:true
    }),
    quantitySelectionWidget({
        storeprefix:"PathSurfaceNormal",
        prompt: StringTable.QUANTITY_SELECTION_PATHSURFACE,
        defaultvalue: 5,
    }),
    quantitySelectionWidget({
        storeprefix:"PathSurfaceQueue",
        prompt: StringTable.QUANTITY_SELECTION_QUEUE,
        defaultvalue: 4,
    }),
    storedCheckbox({
        storekey: "PathSurfaceReplaceExistingObjects",
        prompt: StringTable.REPLACE_PATH_SURFACES,
        tooltip: StringTable.REPLACE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "AssociationRulePreventPathStairAndSlopeVariants",
        prompt: StringTable.DISALLOW_BOTH_SLOPED_AND_STAIRS,
        tooltip: StringTable.DISALLOW_BOTH_SLOPED_AND_STAIRS_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "AssociationRulePreventPathSquareAndRoundedVariants",
        prompt: StringTable.DISALLOW_BOTH_ROUNDED_AND_SQUARE,
        tooltip: StringTable.DISALLOW_BOTH_ROUNDED_AND_SQUARE_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "AssociationRuleBlacklistEditorOnlyPath",
        prompt: StringTable.DISALLOW_EDITOR_PATH,
        tooltip: StringTable.DISALLOW_EDITOR_PATH_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "AssociationRuleBlacklistInvisiblePath",
        prompt: StringTable.DISALLOW_INVISIBLE_PATH,
        tooltip: StringTable.DISALLOW_INVISIBLE_PATH_TOOLTIP,
        defaultvalue: 1
    }),
]

const FootpathSupportsTab = [
    label({text:StringTable.TITLE_FOOTPATH_SUPPORTS_SETTINGS}),
    storedCheckbox({
        storekey: "RandomisePathSupports",
        prompt: StringTable.RANDOMISE_PATH_SUPPORTS,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    sourcePreferenceWidget({
        storeprefix:"footpath_railings", 
        objectTypeString:StringTable.PATH_SUPPORTS,
        includeGlobal:true
    }),
    quantitySelectionWidget({
        storeprefix:"PathSupport",
        prompt: StringTable.QUANTITY_SELECTION_PATHSUPPORTS,
        defaultvalue: 5,
    }),
    storedCheckbox({
        storekey: "PathSupportsReplaceExistingObjects",
        prompt: StringTable.REPLACE_PATH_SUPPORTS,
        tooltip: StringTable.REPLACE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
]

const ParkEntranceTab = [
    label({text:StringTable.TITLE_PARK_ENTRANCE_SETTINGS}),
    storedCheckbox({
        storekey: "RandomiseParkEntrance",
        prompt: StringTable.RANDOMISE_PARK_ENTRANCE,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    sourcePreferenceWidget({
        storeprefix:"park_entrance", 
        objectTypeString:StringTable.PARK_ENTRANCES,
        includeGlobal:true
    }),
]

interface PathAttachmentOneOffParams
{
    objectTypeName: string,
    dropdownkey: ConfigOptionNumber,
    spinnerkey: ConfigOptionNumber,
}

//@ts-ignore suppress unused function warning
function pathAttachmentOneOff(params: PathAttachmentOneOffParams)
{
    let dropdownItems = [StringTable.QUANTITY_SELECTION_SCENARIO_DEFAULT, StringTable.PATH_ATTACHMENT_ONE_OFF_ALWAYS_AVAILABLE, StringTable.PATH_ATTACHMENT_ONE_OFF_RANDOM_CHANCE, StringTable.PATH_ATTACHMENT_ONE_OFF_RANDOM_CHANCE_IF_UNAVAILABLE];
    let dropdownStore = getStaticStore(params.dropdownkey, 0);

    let spinnerVisibilty = getNonpersistentStore<ElementVisibility>("AttachmentOneOffSpinnerVisibility" + params.objectTypeName, "none");
    let dropdownChange = (val: number) =>
    {
        let visible = val > 1;
        let state: ElementVisibility = visible ? "visible" : "none";
        spinnerVisibilty.set(state);
    }
    dropdownChange(dropdownStore.get());
    let content = [horizontal({
            content: [
                label({text: params.objectTypeName + ":"}),
                dropdown({
                items: dropdownItems,
                selectedIndex: twoway(dropdownStore),
                onChange: dropdownChange,
                }),
            ]
    })];
    content.push(spinnerPlusSetter({
        value: twoway(getStaticStore(params.spinnerkey, 50)),
        defaultvalue: 50,
        maximum: 100,
        minimum: 0,
        step: 5,
        width: 60,
        prompt: formatTokens(StringTable.CHANCE_OF_AVAILABILITY, params.objectTypeName),
        visibility: getNonpersistentStore<ElementVisibility>("AttachmentOneOffSpinnerVisibility" + params.objectTypeName, "none"),
    }))
    return vertical({
        content: content
    });
}

const PathAttachmentTab = [
    label({text: StringTable.TITLE_PATH_ATTACHMENT_SETTINGS}),
    storedCheckbox({
        storekey: "RandomiseBenches",
        prompt: StringTable.RANDOMISE_BENCHES,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "RandomiseBins",
        prompt: StringTable.RANDOMISE_BINS,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    storedCheckbox({
        storekey: "RandomiseLamps",
        prompt: StringTable.RANDOMISE_LAMPS,
        tooltip: StringTable.RANDOMISE_OBJECT_TOOLTIP,
        defaultvalue: 1
    }),
    quantitySelectionWidget({
        storeprefix:"Benches",
        prompt: StringTable.QUANTITY_SELECTION_BENCHES,
        defaultvalue: 2,
    }),
    quantitySelectionWidget({
        storeprefix:"Bins",
        prompt: StringTable.QUANTITY_SELECTION_BINS,
        defaultvalue: 2,
    }),
    quantitySelectionWidget({
        storeprefix:"Lamps",
        prompt: StringTable.QUANTITY_SELECTION_LAMPS,
        defaultvalue: 4,
    }),
    storedCheckbox({
        storekey: "PathAttachmentsReplaceExistingObjects",
        prompt: StringTable.REPLACE_PATH_ATTACHMENTS,
        tooltip: StringTable.REPLACE_OBJECT_TOOLTIP,
        defaultvalue: 1,
    }),
    // Even if I load these, the palette issue means they don't show up :(
    /*
    pathAttachmentOneOff({
        dropdownkey: "QueueTVAvailabilityCategory",
        spinnerkey: "QueueTVAvailabilityChance",
        objectTypeName: StringTable.QUEUE_LINE_TV,
    }),
    pathAttachmentOneOff({
        dropdownkey: "JumpingFountainsAvailabilityCategory",
        spinnerkey: "JumpingFountainsAvailabilityChance",
        objectTypeName: StringTable.JUMPING_FOUNTAINS,
    }),
    pathAttachmentOneOff({
        dropdownkey: "JumpingSnowballsAvailabilityCategory",
        spinnerkey: "JumpingSnowballsAvailabilityChance",
        objectTypeName: StringTable.JUMPING_SNOWBALLS,
    }), 
    */
]

const UISettingsTemplate = tabwindow(
{
   title: `${StringTable.PLUGIN_NAME} v${pluginVersion}`,
   width: {value: 600, max: 10000},
   height: {value: 500, max: 10000},
   padding: 5,
   tabs: [
        tab({
            image: tabImageGears,
            height: "auto",
            content: MainTab,
        }),
        tab({
            image: tabImageResearch,
            height: "auto",
            content: ResearchTab,
        }),
        tab({
            image: tabImageRides,
            height: "auto",
            content: RidesTab,
        }),
        tab({
            image: 29431,
            height: "auto",
            content: FootpathSurfaceTab,
        }),
        tab({
            image: 29429,
            height: "auto",
            content: FootpathSupportsTab,
        }),
        tab({
            image: 5200,
            height: "auto",
            content: ParkEntranceTab,
        }),
        tab({
            image: 5464,
            height: "auto",
            content: PathAttachmentTab,
        }),
        tab({
            image: tabImageSaveLoad,
            height: "auto",
            content: SaveLoadTab,
        }),
   ],
});

let haveLoadedSettingsThisSession = false;

export function UISettings()
{
    if (!haveLoadedSettingsThisSession)
    {
        loadFromSharedStorage();
        haveLoadedSettingsThisSession = true;
        for (const func of callOnLoadedStores)
        {
            func();
        }
    }
    UISettingsTemplate.open();
}