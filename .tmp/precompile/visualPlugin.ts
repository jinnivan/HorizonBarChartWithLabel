import { BarChart } from "../../src/barChart";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var BAC49510ab1d3fa4399887df4f629646fbf_DEBUG: IVisualPlugin = {
    name: 'BAC49510ab1d3fa4399887df4f629646fbf_DEBUG',
    displayName: 'Horizontal Bullet Chart with Label',
    class: 'BarChart',
    apiVersion: '3.8.0',
    create: (options: VisualConstructorOptions) => {
        if (BarChart) {
            return new BarChart(options);
        }
        throw 'Visual instance not found';
    },
    createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = globalThis.dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["BAC49510ab1d3fa4399887df4f629646fbf_DEBUG"] = BAC49510ab1d3fa4399887df4f629646fbf_DEBUG;
}
export default BAC49510ab1d3fa4399887df4f629646fbf_DEBUG;