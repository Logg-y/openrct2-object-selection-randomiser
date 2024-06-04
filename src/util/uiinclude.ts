import { WritableStore, spinner, store, twoway, label, horizontal, button, checkbox, dropdown, LabelParams, SpinnerParams} from "openrct2-flexui";
import { StringTable } from "./strings";
import { staticConfigMap, ConfigOptionNumber, ConfigOptionBoolean} from "../sharedstorage";


interface MessageBoxParams
{
    text: string | string[]
    classification?: string,
    width?: number,
    height?: number,
    title?: string,
}

const MessageBoxParamsDefaults = 
{
    title: "Info",
    width: 400,
    height: 200,
    classification: "ParkObjectiveRandomiserMessageBox",
}

const messageBoxTitlePadding = 20;
const messageBoxButtonHeight = 30;

const nonPersistentStores: Record<string, WritableStore<any>> = {};

export function messageBox(params: MessageBoxParams): void
{
    // Unfortunately the one thing I CAN'T figure out how to get flexui to do is to make a button close the window it's on
    // since the close method exists on the return value of window() and by that point it's too late to slip another element in
    if (ui !== undefined)
        {
        let options = {...MessageBoxParamsDefaults, ...params};
        let windowTemplate = options as WindowDesc;
        windowTemplate.widgets = [];
        if (Array.isArray(options.text))
        {
            let index = 0;
            for (const text of options.text)
            {
                windowTemplate.widgets.push({
                    type: "label",
                    x: 0,
                    y: messageBoxTitlePadding + (index*100),
                    width: options.width,
                    height: options.height - (messageBoxButtonHeight + messageBoxTitlePadding),
                    text: text
                })
                index++;
            }
        }
        else
        {
            windowTemplate["widgets"].push(
                {
                    type: "label",
                    x: 0,
                    y: messageBoxTitlePadding,
                    height: options.height - (messageBoxButtonHeight + messageBoxTitlePadding),
                    width: options.width,
                    text: options.text,
                },
            )
        }

        windowTemplate["widgets"].push(
            {
                type: "button",
                x: options.width / 2 - 40,
                y: options.height - (messageBoxTitlePadding + messageBoxButtonHeight),
                height: messageBoxButtonHeight,
                width: 80,
                text: StringTable.OK,
                onClick: () => {
                    ui.getWindow("ParkObjectiveRandomiserMessageBox").close();
                }
            }
        );
        ui.openWindow(windowTemplate);
    }
}

interface YesNoBoxParams
{
    text: string,
    yesbuttontext?: string,
    nobuttontext?: string,
    yesCallback?: () => void;
    noCallback?: () => void;
    title?: string,
}

const YesNoBoxParamsDefaults = 
{
    title: "Are you sure?",
    yesbuttontext: "Yes",
    nobuttontext: "No",
    width: 400,
    height: 200,
    classification: "ParkObjectiveRandomiserYesNoBox",
}


export function yesNoBox(params: YesNoBoxParams): void
{
    if (ui !== undefined)
        {
        let options = {...YesNoBoxParamsDefaults, ...params};
        let windowTemplate = options as WindowDesc;
        windowTemplate["widgets"] = [
            {
                type: "label",
                x: 0,
                y: messageBoxTitlePadding,
                height: options.height - (messageBoxButtonHeight + messageBoxTitlePadding),
                width: options.width,
                text: options.text,
            },
        ];

        windowTemplate["widgets"].push(
            {
                type: "button",
                x: options.width / 4,
                y: options.height - (messageBoxTitlePadding + messageBoxButtonHeight),
                height: messageBoxButtonHeight,
                width: 80,
                text: options.yesbuttontext,
                onClick: () => {
                    ui.getWindow("ParkObjectiveRandomiserYesNoBox").close();
                    if (options.yesCallback !== undefined)
                    {
                        options.yesCallback();
                    }
                }
            }
        );

        windowTemplate["widgets"].push(
            {
                type: "button",
                x: options.width - (options.width / 4) - 80,
                y: options.height - (messageBoxTitlePadding + messageBoxButtonHeight),
                height: messageBoxButtonHeight,
                width: 80,
                text: options.nobuttontext,
                onClick: () => {
                    ui.getWindow("ParkObjectiveRandomiserYesNoBox").close();
                    if (options.noCallback !== undefined)
                    {
                        options.noCallback();
                    }
                }
            }
        );
        
        

        ui.openWindow(windowTemplate);
    }
}

interface StoredNumberSpinnerParams extends SpinnerParams
{
    storekey: ConfigOptionNumber,
    prompt: string,
    defaultvalue: number,
    extendedhelp?: string | string[],
    decimalPlaces?: number,
    formatCurrency?: boolean,
    formatCurrency2dp?: boolean,
    minimum?: number,
    maximum?: number,
    width?: number,
}

const StoredNumberSpinnerDefaults =
{
    tooltip: "",
    width: 65,
    step: 1,
    formatCurrency: false,
    formatCurrency2dp: false,
}

export function storedNumberSpinner(params: StoredNumberSpinnerParams)
{
    let options = {...StoredNumberSpinnerDefaults, ...params};
    let thisStore: undefined | WritableStore<number> = undefined;
    if (staticConfigMap[options.storekey] !== undefined)
    {
        thisStore = staticConfigMap[options.storekey] as WritableStore<number>;
    }
    if (thisStore === undefined)
    {
        thisStore = store(options.defaultvalue);
        staticConfigMap[options.storekey] = thisStore;
    }
    // Unsure how to make TS realise thisStore cannot still be undefined
    let realStore = thisStore as WritableStore<number>;
    let setValueButton = button({
        text: "...",
        height: 14,
        width: 14,
        onClick: () => {
            let rangeString = "";
            if (options.minimum !== undefined)
            {
                if (options.maximum === undefined)
                {
                    rangeString = `(${options.minimum}+)`
                }
                else
                {
                    rangeString = `(${options.minimum} - ${options.maximum})`;
                }
            }
            else if (options.maximum !== undefined)
            {
                rangeString = `(${StringTable.UI_MAX} ${options.maximum})`;
            }
            let desc = StringTable.UI_ENTER_NUMERIC_VALUE_PROMPT;
            if (rangeString != "")
            {
                desc = desc + `{NEWLINE}${rangeString}`;
            }
            desc = desc + `{NEWLINE}${StringTable.UI_DEFAULT}${options.defaultvalue}`;
            ui.showTextInput(
                {
                    title: StringTable.UI_ENTER_VALUE,
                    description: desc,
                    initialValue: String(realStore.get()),
                    callback: (value: string) =>
                    {
                        let numeric = Number(value);
                        if (isNaN(numeric))
                        {
                            ui.showError(StringTable.ERROR, StringTable.UI_VALUE_NOT_NUMERIC);
                            return;
                        }
                        if (options.minimum !== undefined)
                        {
                            numeric = Math.max(numeric, options.minimum);
                        }
                        if (options.maximum !== undefined)
                        {
                            numeric = Math.min(numeric, options.maximum);
                        }
                        realStore.set(numeric);
                    }
                }
            )
        }
    });

    // Make the spinner box narrower if there's an extended help ? button
    // this makes columns of these widgets all align neatly which looks way nicer
    let actualWidth = options.width;
    if (options.extendedhelp !== undefined)
    {
        actualWidth -= 18;
    }

    let promptLabel = label({
        text: options.prompt,
        tooltip: options.tooltip,
    });

    if (options.decimalPlaces !== undefined)
    {
        options.format = (value: number) => value.toFixed(options.decimalPlaces);
    }
    if (options.formatCurrency)
    {
        options.format = (value: number) => context.formatString("{CURRENCY}", value);
    }
    if (options.formatCurrency2dp)
    {
        options.format = (value: number) => context.formatString("{CURRENCY2DP}", value);
    }
    let spinnerObject = spinner({
        value: twoway(thisStore),
        ...options,
        width: actualWidth,
    });

    

    if (options.extendedhelp === undefined)
    {
        return horizontal([
            promptLabel,
            setValueButton,
            spinnerObject,
        ]);    
    }
    else
    {
        // Not sure what the conventional way of making TS realise this can't be undefined here is
        let helpText = options.extendedhelp;
        if (!Array.isArray(helpText))
        {
            helpText = [helpText];
        }
        return horizontal([
            promptLabel,
            setValueButton,
            spinnerObject,
            button({
                //image: 5367,
                text: "?",
                border: true,
                height: 14,
                width: 14,
                onClick: () => messageBox(
                    {
                        text: helpText,
                        height: 120 + helpText.length * 80,
                    }),
            })
        ]);    
    }
}


interface StoredCheckboxParams
{
    storekey: ConfigOptionBoolean,
    prompt: string,
    tooltip?: string,
    defaultvalue: number,
    extendedhelp?: string,
}

const StoredCheckboxDefaults =
{
    tooltip: "",
}

export function storedCheckbox(params: StoredCheckboxParams)
{
    let options = {...StoredCheckboxDefaults, ...params};
    let thisStore: undefined | WritableStore<boolean> = undefined;
    if (staticConfigMap[options.storekey] !== undefined)
    {
        thisStore = staticConfigMap[options.storekey] as WritableStore<boolean>;
    }
    if (thisStore === undefined)
    {
        thisStore = store<boolean>(Boolean(options.defaultvalue));
        staticConfigMap[options.storekey] = thisStore;
    }
    if (options.extendedhelp === undefined)
    {
        return checkbox({
                isChecked: twoway<boolean>(thisStore),
                ...options,
                text: options.prompt,
            });  
    }
    else
    {
        // Not sure what the conventional way of making TS realise this can't be undefined here is
        let helpText = options.extendedhelp as string;
        return horizontal([
            checkbox({
                isChecked: twoway<boolean>(thisStore),
                ...options,
                text: options.prompt,
                onChange (isChecked: boolean | number) : void
                {
                    console.log("checked " + isChecked);
                }
            }), 
            button({
                text: "?",
                border: true,
                height: 14,
                width: 14,
                onClick: () => messageBox(
                    {
                        text: helpText,
                    }),
            })
        ]);    
    }
}


interface StoredDropdownParams
{
    items: string[],
    storekey: ConfigOptionNumber,
    tooltip?: string,
    defaultvalue: number,
    onChange?: (index: number) => void;
}

const StoredDropdownDefaults =
{
    tooltip: "",
}

export function storedDropdown(params: StoredDropdownParams)
{
    let options = {...StoredDropdownDefaults, ...params};
    let thisStore: undefined | WritableStore<number> = undefined;
    if (staticConfigMap[options.storekey] !== undefined)
    {
        thisStore = staticConfigMap[options.storekey] as WritableStore<number>;
    }
    if (thisStore === undefined)
    {
        thisStore = store<number>(options.defaultvalue);
        staticConfigMap[options.storekey] = thisStore;
    }
    return dropdown({
            selectedIndex: twoway<number>(thisStore),
            ...options,
        });  
}

interface LabelWithExtendedHelpParams extends LabelParams
{
    extendedHelp?: string,
}

export function labelWithExtendedHelpWrapper(options: LabelWithExtendedHelpParams)
{
    if (options.extendedHelp == undefined)
    {
        return label(options);
    }
    else
    {
        let output = [label(options), button({
            text: "?",
            border: true,
            height: 14,
            width: 14,
            onClick: () => messageBox(
            {
                text: options.extendedHelp ?? "?",
                height: 200,
            }),
        })]
        return horizontal(output)
    }
}

export function getNonpersistentStore<T>(key: string, defaultval: T): WritableStore<T>
{
    let val = nonPersistentStores[key];
    if (val !== undefined)
    {
        return val as WritableStore<T>
    }
    nonPersistentStores[key] = store<T>(defaultval);
    return nonPersistentStores[key] as WritableStore<T>;
}