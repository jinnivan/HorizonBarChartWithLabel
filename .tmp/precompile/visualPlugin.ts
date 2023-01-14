import { BarChart } from "../../src/barChart";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;

var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var BarChartF5983CEA542C47889C9DE852B430DE5F_DEBUG: IVisualPlugin = {
    name: 'BarChartF5983CEA542C47889C9DE852B430DE5F_DEBUG',
    displayName: 'Horizontal Bar Chart',
    class: 'BarChart',
    apiVersion: '3.2.0',
    create: (options: VisualConstructorOptions) => {
        if (BarChart) {
            return new BarChart(options);
        }
        throw 'Visual instance not found';
    },
    
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["BarChartF5983CEA542C47889C9DE852B430DE5F_DEBUG"] = BarChartF5983CEA542C47889C9DE852B430DE5F_DEBUG;
}
export default BarChartF5983CEA542C47889C9DE852B430DE5F_DEBUG;