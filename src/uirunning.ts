import { window, label } from "openrct2-flexui"
import { StringTable } from "./util/strings";
import { pluginVersion } from "./util/pluginversion";
import { randomiserCurrentStageText, randomiserProgressText } from "./mainworker";


const UIRandomiser = window({
    title: `${StringTable.PLUGIN_NAME} v${pluginVersion}`,
    width: {value: 400, max: 10000},
    height: "auto",
	padding: 5,
    content: [
        label({text:StringTable.TITLE_WORKING}),
        label({text:StringTable.UNPAUSE_WARNING}),
        label({text:randomiserCurrentStageText}),
        label({text:randomiserProgressText, height:25}),
    ],
})

export function UIRandomiserInProgress()
{
    UIRandomiser.open();
}