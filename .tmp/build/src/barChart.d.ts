import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
export declare class BarChart implements IVisual {
    private static Config;
    private svg;
    private divContainer;
    private host;
    private selectionManager;
    private barContainer;
    private xAxis;
    private IBarChartSettings;
    private tooltipServiceWrapper;
    private barSelection;
    private events;
    private localizationManager;
    /**
     * Creates instance of BarChart. This method is only called once.
     *
     * @constructor
     * @param {VisualConstructorOptions} options - Contains references to the element that will
     *                                             contain the visual and a reference to the host
     *                                             which contains services.
     */
    constructor(options: VisualConstructorOptions);
    /**
     * Updates the state of the visual. Every sequential binding and resize will call update.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     */
    update(options: VisualUpdateOptions): void;
    /**
     *  through the objects defined in the capabilities and adds the properties to the format pane
     *
     * @function
     * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
     */
    enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration;
    /**
     * Destroy runs when the visual is removed. Any cleanup that the visual needs to
     * do should be done here.
     *
     * @function
     */
    destroy(): void;
    private isSelectionIdInArray;
    private syncSelectionState;
    private getTooltipData;
}
