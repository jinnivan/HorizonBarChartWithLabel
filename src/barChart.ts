import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { max, min } from "d3-array";
import * as d3 from "d3";
import { scaleBand, scaleLinear} from "d3-scale";
import { textMeasurementService, valueFormatter } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = valueFormatter.IValueFormatter;
import { formattingService } from "powerbi-visuals-utils-formattingutils";
import { TextProperties } from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {
        event as d3Event,
        select as d3Select,
        BaseType, select, Selection 
    } from "d3-selection";

import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
//import ISelectionIdBuilder = powerbi.extensibility.ISelectionIdBuilder;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import IColorPalette = powerbi.extensibility.IColorPalette;
import PrimitiveValue = powerbi.PrimitiveValue;
import Fill = powerbi.Fill;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

/* import {
    legend as Legend,
    legendInterfaces as LI
} from "powerbi-visuals-utils-chartutils";
import createLegend = Legend.createLegend;
import ILegend = LI.ILegend;
import LegendData = LI.LegendData;
import MarkerShape = LI.MarkerShape;
import LegendPosition = LI.LegendPosition; */

import {
    createTooltipServiceWrapper,
    ITooltipEventArgs,
    ITooltipServiceWrapper,
} from "./tooltipServiceWrapper";

import { getCategoricalObjectValue, getValue } from "./objectEnumerationUtility";
import ISelectionId = powerbi.visuals.ISelectionId;
//import { EnumType } from "typescript";
//import { isEmpty } from "powerbi-visuals-utils-svgutils/lib/shapes/shapes";

/**
 * An interface for reporting rendering events
 */
interface IVisualEventService {
	/**
	 * Should be called just before the actual rendering was started.
	 * Usually at the very start of the update method.
	 *
	 * @param options - the visual update options received as update parameter
	 */
    renderingStarted(options: VisualUpdateOptions): void;

	/**
	 * Shoudl be called immediately after finishing successfull rendering.
	 *
	 * @param options - the visual update options received as update parameter
	 */
    renderingFinished(options: VisualUpdateOptions): void;

	/**
	 * Called when rendering failed with optional reason string
	 *
	 * @param options - the visual update options received as update parameter
	 * @param reason - the option failure reason string
	 */
    renderingFailed(options: VisualUpdateOptions, reason?: string): void;
}

/**
 * Interface for BarCharts viewmodel.
 *
 * @interface
 * @property {IBarChartDataPoint[]} dataPoints - Set of data points the visual will render.
 * @property {number} dataMax                 - Maximum data value in the set of data points.
 */
interface IBarChartViewModel {
    dataPoints: IBarChartDataPoint[];
    dataMax: number;
    widthMax: number;
    settings: IBarChartSettings;
}
// interface used by text measurement services
interface ITextProperties {
    text?: string;
    fontFamily: string;
    fontSize: string;
    fontWeight?: string;
    fontStyle?: string;
    whiteSpace?: string;
}
/**
 * Interface for BarChart data points.
 *
 * @interface
 * @property {number} value             - Data value for point.
 * @property {string} category          - Corresponding category of data value.
 * @property {string} color             - Color corresponding to data point.
 * @property {ISelectionId} selectionId - Id assigned to data point for cross filtering
 *                                        and visual interaction.
 */
interface IBarChartDataPoint {
    value: PrimitiveValue;
    formattedValue: string;
    overlapValue: PrimitiveValue;
    formattedOverlapValue: string;
    LabelformattedValue: string;
    category: string;
    precision: number;
    tooltip: any;
    color: string;
    selectionId: ISelectionId;
    width: number;
    currTextWidth: number;
    selected: boolean;
}

interface IBarChartSettings {

    generalView: {
        minHeight: number,
        barHeight: number,
        opacity: number,
        barsColor: any,
        overlapColor: any,
        textColor: any,

    };
    fontParams: {
        show: boolean,
        fontSize: number,
        fontFamily: string,
    };
    units: {
        tooltipUnits: number,
        decimalPlaces: number,
    };
    showBarLabels: {
        show: boolean,
        textColor: any,
        highlightColor: any,
        alignBarLabels: boolean,
    };
    barShape: {
        shape: string,
        labelPosition: string,
        headColor: any,
    };
    barHeight: {
        show: boolean,
        height: number,
        bheight: number,
    };
    experimental: {
        show: boolean,
        InnerbarsLabel: any,
        OuterbarsLabel: any,
        //blendMode: string,
    };
    clearFilters: {
        show: boolean,
    };
}

/**
 * Function that converts queried data into a view model that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */
function visualTransform(options: VisualUpdateOptions, host: IVisualHost): IBarChartViewModel {
    const dataViews = options.dataViews;

    const defaultSettings: IBarChartSettings = {
        barHeight: {
            height: 22,
            bheight: 18,
            show: true,
        },
        barShape: {
            headColor: { solid: { color: "#FEA19E" } },
            labelPosition: "Top",
            shape: "Bar",
        },
        clearFilters: {
            show: true,
        },
        experimental: {
            //blendMode: "difference",
            InnerbarsLabel: { solid: { color: "#FFF" } },
            OuterbarsLabel: { solid: { color: "#000" } },
            show: true,
        },
        fontParams: {
            fontSize: 11,
            show: true,
            fontFamily: "Segoe UI"
        },
        generalView: {
            barHeight: 30,
            barsColor: { solid: { color: "#118DFF" } },
            minHeight: 250,
            opacity: 100,
            overlapColor: { solid: { color: "#12239E" } },
            textColor: { solid: { color: "#000" } },
        },
        showBarLabels: {
            highlightColor: { solid: { color: "#000" } },
            show: true,
            textColor: { solid: { color: "#FFF" } },
            alignBarLabels: true
        },
        units: {
            decimalPlaces: null,
            tooltipUnits: 0,
        },
    };
    
    const viewModel: IBarChartViewModel = {
        dataMax: 0,
        dataPoints: [],
        settings: <IBarChartSettings> {},
        widthMax: 0,
    };

    if (!dataViews
        || !dataViews[0]
        || !dataViews[0].categorical
        || !dataViews[0].categorical.categories
        //|| !dataViews[0].categorical.categories[0].source
        || !dataViews[0].categorical.values) {
        return viewModel;
    }

    const categorical = dataViews[0].categorical;
    const category = categorical.categories[0];
    const metadata = dataViews[0].metadata;

    let dataValue = categorical.values[0];
    const dataIndex = getIndex(metadata,"measure");

    if (dataIndex !== -1) {
        dataValue = getDataValue(categorical.values, dataIndex);
    }

    let overlapDataValue = [];
    const overlapIndex = getIndex(metadata,"overlapValues");
    if (overlapIndex !== -1) {
        overlapDataValue = getDataValue(categorical.values, overlapIndex).values;
    }

    let LabelDataValue = [];
    const LabelIndex = getIndex(metadata,"LabelValues");
    if (LabelIndex !== -1) {
        LabelDataValue = getDataValue(categorical.values, LabelIndex).values;
    }

    const tooltipData = categorical.values.slice(0, categorical.values.length); //loop tooltip index

    let valueFormatterForCategories: IValueFormatter = valueFormatter.create({
        format: valueFormatter.getFormatStringByColumn(category.source),
        value: dataValue,
        value2: categorical.values[categorical.values.length - 1],
    });


    const IBarChartDataPoints: IBarChartDataPoint[] = [];
    const lenMax = 0;
    let currTextWidth = 0;
    const colorPalette: IColorPalette = host.colorPalette;

    const objects = metadata.objects;

    let textProperties: ITextProperties;

    const IBarChartSettings: IBarChartSettings = {
        barHeight: {
            height: getValue<number> (objects, "barHeight", "height",
                defaultSettings.barHeight.height),
            bheight: getValue<number> (objects, "barHeight", "bheight",
                defaultSettings.barHeight.bheight),
            show: getValue<boolean> (objects, "barHeight", "show",
                defaultSettings.barHeight.show),
        },
        barShape: {
            headColor: getValue<string> (objects, "barShape", "headColor",
                defaultSettings.barShape.headColor),
            labelPosition: getValue<string> (objects, "barShape", "labelPosition",
                defaultSettings.barShape.labelPosition),
            shape: getValue<string> (objects, "barShape", "shape",
                defaultSettings.barShape.shape),
        },
        clearFilters: {
            show: getValue<boolean> (objects, "clearFilters", "show",
                defaultSettings.clearFilters.show),
        },
        experimental: {
            //blendMode: getValue<string> (objects, "experimental", "blendMode",
            //    defaultSettings.experimental.blendMode),
            InnerbarsLabel: getValue<string> (objects, "experimental", "InnerbarsLabel",
                defaultSettings.experimental.InnerbarsLabel),
            OuterbarsLabel: getValue<string> (objects, "experimental", "OuterbarsLabel",
                defaultSettings.experimental.OuterbarsLabel),
            show: getValue<boolean> (objects, "experimental", "show",
                defaultSettings.experimental.show),
        },
        fontParams: {
            fontSize: getValue<number> (objects, "fontParams", "fontSize",
                defaultSettings.fontParams.fontSize),
            show: getValue<boolean> (objects, "fontParams", "show",
                defaultSettings.fontParams.show),
            fontFamily: getValue<string> (objects, "fontParams", "fontFamily",
                defaultSettings.fontParams.fontFamily),
        },
        generalView: {
            barHeight: getValue<number> (objects, "generalView", "barHeight", defaultSettings.generalView.barHeight),
            barsColor: getValue<string> (objects, "generalView", "barsColor", defaultSettings.generalView.barsColor),
            minHeight: getValue<number> (objects, "generalView", "minHeight", defaultSettings.generalView.minHeight),
            opacity: getValue<number> (objects, "generalView", "opacity", defaultSettings.generalView.opacity),
            overlapColor: getValue<string> (objects, "generalView", "overlapColor",
                defaultSettings.generalView.overlapColor),
            textColor: getValue<string> (objects, "generalView", "textColor",
                defaultSettings.generalView.textColor),
        },
        showBarLabels: {
            highlightColor: getValue<string> (objects, "showBarLabels", "highlightColor",
            defaultSettings.showBarLabels.highlightColor),
            show: getValue<boolean> (objects, "showBarLabels", "show",
            defaultSettings.showBarLabels.show),
            textColor: getValue<string> (objects, "showBarLabels", "textColor",
            defaultSettings.showBarLabels.textColor),
            alignBarLabels: getValue<boolean> (objects, "showBarLabels", "alignBarLabels",
            defaultSettings.showBarLabels.alignBarLabels),
        },
        units: {
            decimalPlaces: getValue<number> (objects, "units", "decimalPlaces",
                defaultSettings.units.decimalPlaces),
            tooltipUnits: getValue<number> (objects, "units", "tooltipUnits",
                defaultSettings.units.tooltipUnits),
        },

    };


    /********** TOOLTIP *************/
    for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
        const defaultColor: Fill = {
            solid: {
                color: colorPalette.getColor(category.values[i] + "").value,
            },
        };

        valueFormatterForCategories = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(metadata.columns[i]),
            value: dataValue,
            value2: categorical.values[categorical.values.length - 1],
        });

        const tooltip = [];
        let index;

        for (const tooltipDataItem of tooltipData) {
        // for (let j = 0; j < tooltipData.length; j++) {

            index = getMetadataIndexFor(tooltipDataItem.source.displayName, metadata.columns);

            valueFormatterForCategories = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(metadata.columns[index]),
                value: dataValue,
                value2: categorical.values[categorical.values.length - 1],
            });
            tooltip.push({
                displayName: tooltipDataItem.source.displayName,
                value: valueFormatterForCategories.format(tooltipDataItem.values[i]),
            });
        }

        const format = valueFormatter.getFormatStringByColumn(
            metadata.columns[getMetadataIndexFor(
                categorical.values[0].source.displayName, metadata.columns)]);

        valueFormatterForCategories = valueFormatter.create({
            format,
            value: dataValue,
            value2: categorical.values[categorical.values.length - 1],
        });

        const valueFormatterForOverlap = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(
                metadata.columns[getMetadataIndexFor(
                    categorical.values[1].source.displayName, metadata.columns)]),
            value: dataValue,
            value2: categorical.values[categorical.values.length - 1],
        });

        
        textProperties = {
            fontFamily: IBarChartSettings.fontParams.fontFamily,
            fontSize: IBarChartSettings.fontParams.fontSize + "px",
            text: valueFormatterForCategories.format(category.values[i]),
        };
        currTextWidth = textMeasurementService.measureSvgTextWidth(textProperties);

        IBarChartDataPoints.push({
            category: category.values[i] + "",
            color: getCategoricalObjectValue<Fill> (category, i, "colorSelector", "fill", defaultColor).solid.color,
            currTextWidth,
            formattedOverlapValue: overlapDataValue.length > 0 ? valueFormatterForOverlap.format(overlapDataValue[i]) : null,
            formattedValue: valueFormatterForCategories.format(dataValue.values[i]),
            overlapValue: overlapDataValue.length > 0 ? overlapDataValue[i] : null,
            LabelformattedValue: LabelDataValue.length > 0 ? valueFormatterForCategories.format(LabelDataValue[i]) : null,
            precision: formattingService.numberFormat.isStandardFormat(format) === false ?
                formattingService.numberFormat.getCustomFormatMetadata(format, true).precision : null,
            selected: false,
            selectionId: host.createSelectionIdBuilder()
                .withCategory(category, i)
                .createSelectionId(),
            tooltip,
            value: dataValue.values[i],
            width: null,
        });

    }

    // Front bar 
    const overlapDataValueMax = Math.max(...overlapDataValue);
    const dataMaxLocal = <number> dataValue.maxLocal <= overlapDataValueMax ? overlapDataValueMax : dataValue.maxLocal;


    return {
        dataMax:<number>dataMaxLocal ,
        dataPoints: IBarChartDataPoints,
        settings: IBarChartSettings,
        widthMax: lenMax,
    };
}


function getIndex(metadata,Property) {
    let index = -1;
    if (metadata.columns && metadata.columns.length > 0) {
        metadata.columns.forEach((element) => {
            if (element.roles && Object.prototype.hasOwnProperty.call(element.roles,Property)) {
                index = element.index;
            }
        });
    }
    return index;
}

function getDataValue(values, Index) {
    let index = -1;
    for (let i = 0; i < values.length; i++) {
        if (values[i].source.index === Index) {
            index = i;
            break;
        }
    }
    if (index !== -1) {
        return values[index];
    } else {
        return [];
    }
}

export class BarChart implements IVisual {

    private static Config = {
        barPadding: 0.15,
        fontScaleFactor: 3,
        maxHeightScale: 3,
        outerPaddingScale: 0.5,
        solidOpacity: 1,
        transparentOpacity: 0.5,
        xAxisFontMultiplier: 0.04,
        xScalePadding: 0.15,
        xScaledMin: 30,
    };
    private svg: Selection<SVGElement, unknown , HTMLElement, any>;
    private divContainer: Selection<SVGElement, unknown , HTMLElement, any>;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private barContainer: Selection<SVGElement, unknown , HTMLElement, any>;
    private xAxis: Selection<SVGElement, unknown , HTMLElement, any>;
    private IBarChartSettings: IBarChartSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private barSelection: Selection<BaseType, IBarChartDataPoint, BaseType, any>;
    private events: IVisualEventService;
    private localizationManager: ILocalizationManager;

    /**
     * Creates instance of BarChart. This method is only called once.
     *
     * @constructor
     * @param {VisualConstructorOptions} options - Contains references to the element that will
     *                                             contain the visual and a reference to the host
     *                                             which contains services.
     */
    constructor(options: VisualConstructorOptions) {
        this.localizationManager = options.host.createLocalizationManager();
        this.events = options.host.eventService;
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.selectionManager.registerOnSelectCallback(() => {
        this.syncSelectionState(this.barSelection, this.selectionManager.getSelectionIds() as ISelectionId[]);
        });

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        const svg = this.svg = select(options.element)
            .append<SVGElement> ("div")
            .classed("divContainer", true)
            .append<SVGElement> ("svg")
            .classed("barChart", true);

        this.barContainer = svg.append<SVGElement> ("g")
            .classed("barContainer", true);
        this.xAxis = svg.append<SVGElement> ("g")
            .classed("xAxis", true);
        this.divContainer = select(".divContainer");

        // Context Menu
        this.handleContextMenu();
    }

    /**
     * Updates the state of the visual. Every sequential binding and resize will call update.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     */
    public update(options: VisualUpdateOptions) {

        if (!options || !options.dataViews || !options.dataViews[0] || !options.dataViews[1] || !options.dataViews[2]) {
            this.clearViewport(); }
        this.events.renderingStarted(options);
        const viewModel: IBarChartViewModel = visualTransform(options, this.host);
        const settings = this.IBarChartSettings = viewModel.settings;
        const width = options.viewport.width;
        let height = options.viewport.height;
        const xScaledMax = (settings.barHeight.bheight === 0 ? height / BarChart.Config.maxHeightScale : settings.barHeight.bheight);
        let xScaledMin = (settings.barHeight.bheight === 0 ? BarChart.Config.xScaledMin : settings.barHeight.bheight);
        if (settings.barHeight && settings.barHeight.show) {
            xScaledMin = settings.barHeight.height;
        } else {
            xScaledMin = BarChart.Config.xScaledMin;
        }
        let outerPadding = -0.1
        const calcX = height / (2 * BarChart.Config.outerPaddingScale - BarChart.Config.xScalePadding + viewModel.dataPoints.length);
        const calcHeight = (-2 * outerPadding - BarChart.Config.xScalePadding + viewModel.dataPoints.length) * xScaledMin;
        if (calcX > xScaledMax) {
            if (xScaledMax >= xScaledMin) {
                const tempouterPadding = (height - (-BarChart.Config.xScalePadding + viewModel.dataPoints.length) * xScaledMax) / (2 * xScaledMax);
                if (tempouterPadding > 0) {outerPadding = tempouterPadding;}
            } else {
                const tempOuterPadding = (height - (-BarChart.Config.xScalePadding + viewModel.dataPoints.length) * xScaledMin) / (2 * xScaledMin);
                if (tempOuterPadding > 0) {outerPadding = tempOuterPadding;}
        }
        } else { if (calcX < xScaledMin && calcHeight > height) { height = calcHeight ; }}
        const h = options.viewport.height + 5;
        const w = options.viewport.width;
        this.divContainer.attr("style", "width:" + w + "px;height:" + h + "px;overflow-y:auto;overflow-x:hidden;margin-top:14px;margin-bottom:5px;");
        this.svg.attr("width", width);
        this.svg.attr("height", height);
        this.xAxis.style("font-size", parseInt(min(<any>[height, width]), 10) * BarChart.Config.xAxisFontMultiplier);
        const yScale = scaleBand()
            .domain(viewModel.dataPoints.map((d) => d.category))
            .rangeRound([5, height])
            .padding(BarChart.Config.barPadding)
            .paddingOuter(outerPadding)
            .align(0)
        const yHeight = (settings.barHeight.bheight === 0 ? yScale.bandwidth() : settings.barHeight.bheight);
        let fontSizeToUse = this.IBarChartSettings.fontParams && this.IBarChartSettings.fontParams.show
            ? this.IBarChartSettings.fontParams.fontSize
            : yHeight / BarChart.Config.fontScaleFactor;
        if (fontSizeToUse < 8.5 && !this.IBarChartSettings.fontParams.show) {
            fontSizeToUse = 8.5;}
        if (fontSizeToUse > 40 && !this.IBarChartSettings.fontParams.show) {
            fontSizeToUse = 40;}
        const fontFamilyToUse = this.IBarChartSettings.fontParams && this.IBarChartSettings.fontParams.show ? this.IBarChartSettings.fontParams.fontFamily : "Segoe UI";
        const indexForDataMax = getIndexForDataMax(viewModel.dataPoints);
        const formattedValue = viewModel.dataPoints.length > 0 ? viewModel.dataPoints[indexForDataMax].formattedValue : "";
        let textProperties: ITextProperties = {
            fontFamily: fontFamilyToUse,
            fontSize: fontSizeToUse + "px",
            text: formattedValue,};
        // MAX Category Range ***********************************/
        const indexForCateMax = getIndexForCateMax(viewModel.dataPoints);
        const CateformattedValue = viewModel.dataPoints.length > 0 ? viewModel.dataPoints[indexForCateMax].category : "";
        const CateProperties: ITextProperties = {
            fontFamily: fontFamilyToUse,
            fontSize: fontSizeToUse + "px",
            text: CateformattedValue,}; 
        const CateOffset = (yHeight > 10 + BarChart.Config.xScalePadding + textMeasurementService.measureSvgTextWidth(CateProperties) ? yHeight/2  : 10 + BarChart.Config.xScalePadding + textMeasurementService.measureSvgTextWidth(CateProperties)); 
        // MAX Bar Label Range ***********************************/
        const indexForLabelMax = getIndexForLabelMax(viewModel.dataPoints);
        const LabelformattedValue = viewModel.dataPoints.length > 0 ? viewModel.dataPoints[indexForLabelMax].LabelformattedValue : "";
        const labelProperties: ITextProperties = {
            fontFamily: fontFamilyToUse,
            fontSize: fontSizeToUse + "px",
            text: LabelformattedValue,
        }; 
        const offset = textMeasurementService.measureSvgTextWidth(labelProperties) + 30 ;
        const xScale = scaleLinear()
            .domain([0, viewModel.dataMax])
            .range([0, (viewModel.settings.showBarLabels.show 
                ? width - offset - 
                ((settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head") ? BarChart.Config.xScalePadding : CateOffset)
                - 15 
                : width - 
                ((settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head") ? BarChart.Config.xScalePadding : CateOffset)
                - 15) ]); // subtracting 40 for padding between the bar and the label

        // empty rect to take full width for clickable area for clearing selection
        const rectContainer = this.barContainer.selectAll("rect.rect-container").data([1]);

        rectContainer.enter()
        rectContainer.append<SVGElement> ("rect")
        rectContainer.classed("rect-container", true);
        rectContainer.attr("width", width);
        rectContainer.attr("height", height);
        rectContainer.attr("fill", "transparent");

        let bars = this.barContainer
            .selectAll("g.bar")
            .data(viewModel.dataPoints);

        if (viewModel.dataPoints.length === 0) {
            this.clearViewport();
        }

        bars
            .enter()
            .append<SVGElement> ("g")
            .classed("bar", true)
            .attr("x", BarChart.Config.xScalePadding)// .merge(bars)
            .attr("y", (d) => yScale(d.category))
            .attr("height", yHeight)
            .attr("width", (d) => xScale(<number> d.value))
            .attr("selected", (d) => d.selected);

        bars = this.barContainer
            .selectAll("g.bar")
            .data(viewModel.dataPoints);
            const rects = bars
            .selectAll("rect.bar").data((d) => [d]);

        let mergeElement = rects
            .enter()
            .append<SVGElement> ("rect")
            .classed("bar", true);

        rects
            .merge(mergeElement)
            .attr("x", 
                (settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head") ? BarChart.Config.xScalePadding : CateOffset)
            .attr("y", (d) => yScale(d.category))
            .attr("height", yHeight /
                ((  settings.barShape.shape === "Line" ||
                    settings.barShape.shape === "Lollipop" ||
                    settings.barShape.shape === "Hammer Head") ? 8 : 1 ))
            .attr("width", (d) => xScale(<number> d.value))
            .attr("fill", viewModel.settings.generalView.barsColor.solid.color)
            .attr("fill-opacity", viewModel.settings.generalView.opacity / 100)
            .attr("selected", (d) => d.selected);
        rects.exit().remove();
        const overlapRects = bars.selectAll("rect.overlapBar").data((d) => [d]);
        mergeElement = overlapRects
            .enter()
            .append<SVGElement> ("rect")
            .classed("overlapBar", true);
        overlapRects
            .merge(mergeElement)
            .attr("x",
                (settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head") ? BarChart.Config.xScalePadding : CateOffset)
            .attr("y", (d) => yScale(d.category) + ( yHeight /
            ((  settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head"
            ) ? 8 : 1) - yHeight /
            ((
                settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head"
            ) ? 8 : 1.5)) / 2 )
            .attr("height", yHeight /
                (
                    (   settings.barShape.shape === "Line" ||
                        settings.barShape.shape === "Lollipop" ||
                        settings.barShape.shape === "Hammer Head"
                    ) ? 8 : 1.5))
            .attr("width", (d) => xScale(<number> d.overlapValue)).merge(mergeElement)
            .attr("fill", viewModel.settings.generalView.overlapColor.solid.color)
            .attr("fill-opacity", viewModel.settings.generalView.opacity / 100)
            .attr("selected", (d) => d.selected);
        overlapRects.exit().remove();
        if (settings.barShape.shape === "Lollipop") {
            const circle = bars.selectAll("circle").data((d) => [d]);

            mergeElement = circle.enter()
                .append<SVGElement> ("circle")
                .classed("head", true);
            circle
                .merge(mergeElement)
                .attr("cx", (d) => getHeadPositionX(d.value, d.width) - 2 - yHeight / 8)
                .attr("cy", (d) => yScale(d.category) + yHeight / 16)
                .attr("r", yHeight / 8)
                .attr("fill", viewModel.settings.barShape.headColor.solid.color)
                .attr("fill-opacity", viewModel.settings.generalView.opacity / 100);
            circle.exit().remove();
        } else {
            bars.selectAll("circle").remove();
        }
        if (settings.barShape.shape === "Hammer Head") {
            const line = bars.selectAll("line").data((d) => [d]);
            mergeElement = line.enter()
                .append<SVGElement> ("line")
                .classed("head", true);
            line.merge(mergeElement)
                .attr("x1", (d) => getHeadPositionX(d.value, d.width) - 7 - yHeight / 32)
                .attr("x2", (d) => getHeadPositionX(d.value, d.width) - 7 - yHeight / 32)
                .attr("y1", (d) => yScale(d.category) - yHeight / 16)
                // - textMeasurementService.measureSvgTextHeight(textProperties) / 4,
                .attr("y2", (d) => yScale(d.category) + yHeight / 16 + yHeight / 8)
                // - textMeasurementService.measureSvgTextHeight(textProperties) / 4,
                .attr("stroke-width", yHeight / 16)
                .attr("stroke", viewModel.settings.barShape.headColor.solid.color)
                .attr("stroke-opacity", viewModel.settings.generalView.opacity / 100);
            line.exit().remove();
        } else {
            bars.selectAll("line").remove();
        }
        textProperties = {
            fontFamily: fontFamilyToUse,
            fontSize: fontSizeToUse + "px",
            text: "TEXT for calculating height",
        };
        const texts = bars
            .selectAll("text.bar-text").data((d) => [d]);
        mergeElement = (settings.barShape.shape === "Line" ||
        settings.barShape.shape === "Lollipop" ||
        settings.barShape.shape === "Hammer Head") 
        ? texts
            .enter()
            .append<SVGElement> ("text")
            .classed("bar-text", true)
            .attr("text-anchor", "start")
        : texts
            .enter()
            .append<SVGElement> ("text")
            .classed("bar-text", true)
            .attr("text-anchor", "end")
        ;
        texts.merge(mergeElement)
            .attr("height", yHeight)
            .attr("y", (d) => yScale(d.category) + yHeight / 2 + textMeasurementService.measureSvgTextHeight(textProperties) / 4)
            .attr("x", (d) => (settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head") ? BarChart.Config.xScalePadding : CateOffset - 10)
            .attr("font-size", fontSizeToUse)
            .attr("font-family", fontFamilyToUse)
            .attr("fill", viewModel.settings.generalView.textColor.solid.color)
            .attr("width", (d) =>  CateOffset)
            .text((d) => d.category)
        texts.exit().remove();

///////////////////////////////////////////////////////////////////////////////// Bar Label       

if (viewModel.settings.experimental.show){
    const textValues2 = bars
    .selectAll("text.overlap-value").data((d) => [d]);
    mergeElement = textValues2
    .enter()
    .append<SVGElement> ("text")
    .classed("overlap-value", true)
    textValues2.merge(mergeElement).attr("height", yHeight)
    .attr("y", (d) => getTextPositionY(d.category, textProperties))
    .attr("x", (d) => { return  xScale(<number> d.overlapValue) > getWidth( d.formattedOverlapValue)+ 10 
        ? CateOffset + xScale(<number> d.overlapValue) - 5 
        : CateOffset + xScale(<number> d.overlapValue) + 5;
    })
    .attr("text-anchor", (d) => { return  xScale(<number> d.overlapValue) > getWidth( d.formattedOverlapValue)+ 10 ? "end" : "start"; 
    })
    .attr("font-size", (d) => { return  xScale(<number> d.overlapValue) > getWidth( d.formattedOverlapValue)+ 10 ? fontSizeToUse-1 : fontSizeToUse;
    })
    .attr("font-family", fontFamilyToUse) 
    .attr("fill", (d) => { return  xScale(<number> d.overlapValue) > getWidth( d.formattedOverlapValue)+ 10   
        ? viewModel.settings.experimental.InnerbarsLabel.solid.color 
        : viewModel.settings.experimental.OuterbarsLabel.solid.color; })
    .text((d) => { return <string>  d.formattedOverlapValue; });
    textValues2.exit().remove();
} else {
    const textValues2 = bars.selectAll("text.overlap-value")
    textValues2.remove()
}
////////////////////////////////////////////////////////////////////// Second Label
    if (viewModel.settings.showBarLabels.show) {
        const valuesRect = bars.selectAll("rect.valuesRect").data((d) => [d]);
        mergeElement = valuesRect
            .enter()
            .append<SVGElement> ("rect")
            .classed("valuesRect", true);
        valuesRect
            .merge(mergeElement)
            .attr("x", (d) => viewModel.settings.showBarLabels.alignBarLabels === true
                ? getTextPositionX( viewModel.dataMax, d.overlapValue , d.currTextWidth , CateOffset) + 6 
                : getTextPositionX(d.value , d.overlapValue , d.currTextWidth , CateOffset) + 6 )
            .attr("y", (d) => getTextPositionY(d.category, labelProperties) - 3
                / 4 * textMeasurementService.measureSvgTextHeight(labelProperties))
            .attr("height", textMeasurementService.measureSvgTextHeight(labelProperties))
            .attr("width", (d) => (d.LabelformattedValue != null ? offset : 0 ))
            .attr("fill", viewModel.settings.showBarLabels.highlightColor.solid.color)
            .attr("fill-opacity", viewModel.settings.generalView.opacity / 100)
            .attr("rx", 2)
            .attr("ry", 2);
        valuesRect.exit().remove();
        const textValues = bars
            .selectAll("text.bar-value").data((d) => [d]);
        mergeElement = textValues
            .enter()
            .append<SVGElement> ("text")
            .classed("bar-value", true)
        textValues.merge(mergeElement).attr("height", yHeight)
            .attr("y", (d) => getTextPositionY(d.category, textProperties))
            .attr("x", (d) => {
                return viewModel.settings.showBarLabels.alignBarLabels === true
                    ? offset +  getTextPositionX(viewModel.dataMax , d.overlapValue , d.currTextWidth , CateOffset)
                    :  getTextPositionX(d.value , d.overlapValue , d.currTextWidth , CateOffset);})
            .attr("font-size", fontSizeToUse+1)
            .attr("font-family", fontFamilyToUse)
            .attr("fill", viewModel.settings.showBarLabels.textColor.solid.color)
            .attr("text-anchor", (d) => { return  viewModel.settings.showBarLabels.alignBarLabels === true ?"end" :"start"; 
            })
            .text((d) => { return <string> d.LabelformattedValue; });
        textValues.exit().remove();
    } else {
        const valuesRect = bars.selectAll("rect.valuesRect")
        const textValues = bars.selectAll("text.bar-value")
        valuesRect.remove()
        textValues.remove()
    }

///////////////////////////////////////////////////////////////////////////////// Tooltip

    this.tooltipServiceWrapper.addTooltip(this.barContainer.selectAll(".bar"),
        (tooltipEvent: ITooltipEventArgs<IBarChartDataPoint>) => this.getTooltipData(tooltipEvent.data),
        (tooltipEvent: ITooltipEventArgs<IBarChartDataPoint>) => tooltipEvent.data.selectionId,
    );
    this.syncSelectionState(
        bars,
        this.selectionManager.getSelectionIds() as ISelectionId[],
    );
    this.syncSelectionState(
        rects,
        this.selectionManager.getSelectionIds() as ISelectionId[],
    );
    this.syncSelectionState(
        overlapRects,
        this.selectionManager.getSelectionIds() as ISelectionId[],
    );
    const selectionManager = this.selectionManager;
    const syncSelectionState = this.syncSelectionState;
    const IBarChartSettings = this.IBarChartSettings;
    const area = select("rect.rect-container");
    area.on("click", () => {
        if (IBarChartSettings.clearFilters.show && selectionManager.hasSelection()) {
            selectionManager.clear().then(() => {
                syncSelectionState(bars, []);
                syncSelectionState(rects, []);
                syncSelectionState(overlapRects, []);
            });
        }

        bars.attr("fill-opacity", BarChart.Config.solidOpacity);
        rects.attr("fill-opacity", BarChart.Config.solidOpacity);
        overlapRects.attr("fill-opacity", BarChart.Config.solidOpacity);

    });

    bars.on("click", (d) => {
        selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
            syncSelectionState(bars, ids);
            syncSelectionState(rects, ids);
            syncSelectionState(overlapRects, ids);
        });
    });
    bars.exit()
        .remove();

    function getWidth(value: PrimitiveValue){
        const labelProperties: ITextProperties = {
            fontFamily: fontFamilyToUse,
            fontSize: fontSizeToUse + "px",
            text: <string> value,
        }; 
        return textMeasurementService.measureSvgTextWidth(labelProperties);
    }
    function toFormat(value:PrimitiveValue,format: string ){
        let result;
        if (value === null){
            result = ""
        } else {
            result = d3.format(format)(<number> value )
        }
        return result;
    }
    function getTextPositionX(value: PrimitiveValue ,overlap: PrimitiveValue , wid: number, Offset: number) {
        if (settings.barShape.shape === "Bar") {
            return  5 + Offset + (xScale(<number> overlap) > xScale(<number> value) || isNaN(xScale(<number> value)) ? xScale(<number> overlap) : xScale(<number> value) > 0 ?  xScale(<number> value) : 0 );
        } else if (
            settings.barShape.shape === "Line" ||
            settings.barShape.shape === "Lollipop" ||
            settings.barShape.shape === "Hammer Head") {
            if (viewModel.settings.showBarLabels.alignBarLabels === true) {
                return 1.01 * (xScale(<number> value) + 8);
            }
            if (settings.barShape.labelPosition === "Top") {
                return 1.01 * (xScale(<number> value) + 8);
            } else {
                return 1.01 * (wid + 8);
            }
        }
    }

    function getTextPositionY(category: string, textProps: TextProperties) {
        if (settings.barShape.shape === "Bar") {
            return yScale(category) + yHeight / 2 +
                textMeasurementService.measureSvgTextHeight(textProps) / 4;
        } else if (settings.barShape.shape === "Line" ||
                settings.barShape.shape === "Lollipop" ||
                settings.barShape.shape === "Hammer Head") {
            if (settings.barShape.labelPosition === "Top") {
                return yScale(category) +
                yHeight / 16 +
                textMeasurementService.measureSvgTextHeight(textProps) / 4;
            } else {
                return yScale(category) +
                yHeight / 2 +
                textMeasurementService.measureSvgTextHeight(textProps) / 4;
            }
        }
    }

    function getHeadPositionX(value: PrimitiveValue, wid: number) {

        if (settings.barShape.shape === "Bar") {
            return xScale(<number> value) > wid ? xScale(<number> value) + 8 : wid + 8;
        } else if (settings.barShape.shape === "Line" ||
            settings.barShape.shape === "Lollipop" ||
            settings.barShape.shape === "Hammer Head") {
            return xScale(<number> value) + 8;
        }
    }
    this.events.renderingFinished(options);
}

/**
 *  through the objects defined in the capabilities and adds the properties to the format pane
 *
 * @function
 * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
 */
public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
    const objectName = options.objectName;
    const objectEnumeration: VisualObjectInstance[] = [];

    switch (objectName) {
        case "fontParams":
            objectEnumeration.push({
                objectName,
                properties: {
                    fontFamily: this.IBarChartSettings.fontParams.fontFamily,
                    fontSize: this.IBarChartSettings.fontParams.fontSize,
                    show: this.IBarChartSettings.fontParams.show,
                },
                selector: null,
            });
            break;
        case "generalView":
            objectEnumeration.push({
                objectName,
                properties: {
                    overlapColor: this.IBarChartSettings.generalView.overlapColor,
                    barsColor: this.IBarChartSettings.generalView.barsColor,
                    opacity: this.IBarChartSettings.generalView.opacity,
                    textColor: this.IBarChartSettings.generalView.textColor,
                },
                selector: null,
                validValues: {
                    barHeight: {
                        numberRange: {
                            max: 200,
                            min: 20,
                        },
                    },
                    minHeight: {
                        numberRange: {
                            max: 2500,
                            min: 50,
                        },
                    },
                    opacity: {
                        numberRange: {
                            max: 100,
                            min: 10,
                        },
                    },
                },
            });
            break;
        case "showBarLabels":
            objectEnumeration.push({
                objectName,
                properties: {
                    highlightColor: this.IBarChartSettings.showBarLabels.highlightColor,
                    show: this.IBarChartSettings.showBarLabels.show,
                    textColor: this.IBarChartSettings.showBarLabels.textColor,
                    alignBarLabels: this.IBarChartSettings.showBarLabels.alignBarLabels,
                },
                selector: null,
            });
            break;
        /* case "barShape":
            objectEnumeration.push({
                objectName,
                properties: {
                    headColor: this.IBarChartSettings.barShape.headColor,
                    labelPosition: this.IBarChartSettings.barShape.labelPosition,
                    shape: this.IBarChartSettings.barShape.shape,
                },
                selector: null,
            });
            break; */
        case "barHeight":
            objectEnumeration.push({
                objectName,
                properties: {
                    height: this.IBarChartSettings.barHeight.height,
                    bheight: this.IBarChartSettings.barHeight.bheight,
                    show: this.IBarChartSettings.barHeight.show,
                },
                selector: null,
                validValues: {

                    height: {
                        numberRange: {
                            max: 200,
                            min: 20,
                        },
                    },
                    bheight: {
                        numberRange: {
                            max: 100,
                            min: 0,
                        },
                    },
                },
            });
            break;
        case "experimental":
            objectEnumeration.push({
                objectName,
                properties: {
                    //blendMode: this.IBarChartSettings.experimental.blendMode,
                    InnerbarsLabel: this.IBarChartSettings.experimental.InnerbarsLabel,
                    OuterbarsLabel: this.IBarChartSettings.experimental.OuterbarsLabel,
                    show: this.IBarChartSettings.experimental.show,
                },
                selector: null,
            });
            break;
        case "clearFilters":
            objectEnumeration.push({
                objectName,
                properties: {
                    show: this.IBarChartSettings.clearFilters.show,
                },
                selector: null,
            });
            break;
        default:
            break;
    }
    return objectEnumeration;
}

/**
 * Destroy runs when the visual is removed. Any cleanup that the visual needs to
 * do should be done here.
 *
 * @function
 */
public destroy(): void {
    // Perform any cleanup tasks here
}
private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
    if (!selectionIds || !selectionId) {
        return false;
    }

    return selectionIds.some((currentSelectionId: ISelectionId) => {
        return currentSelectionId.includes(selectionId);
    });
}

private clearViewport(): void {
    const removeBars = this.barContainer.selectAll("g.bar");
    removeBars.selectAll("rect.bar").remove();
    removeBars.selectAll("rect.overlapBar").remove();
    removeBars.selectAll("circle").remove();
    removeBars.selectAll("line").remove();
    removeBars.selectAll("text.bar-value").remove();
    removeBars.selectAll("text.overlap-value").remove();
    removeBars.selectAll("text.bar-text").remove();
    removeBars.selectAll("rect.valuesRect").remove();
    removeBars.remove();
}
private syncSelectionState(
    selection: Selection<BaseType, IBarChartDataPoint, BaseType, any>,
    selectionIds: ISelectionId[]): void {
    if (!selection || !selectionIds) {
        return;
    }

    if (!selectionIds.length) {
        selection.style("fill-opacity", null);
        return;
    }

    const self = this.isSelectionIdInArray;
    selection.each((barDataPoint , i , nodes) => {
        const isSelected: boolean = self(selectionIds, barDataPoint.selectionId);
        select(nodes[i]).style(
            "fill-opacity",
            isSelected
                ? BarChart.Config.solidOpacity
                : BarChart.Config.transparentOpacity,
        );
    });

}
private getTooltipData(value: any): VisualTooltipDataItem[] {

    const tooltip = [];
    tooltip.push({
        header: value.category,
        //displayName: value.category,
        //value: value.formattedValue,
    });

    value.tooltip.forEach((element) => {
        tooltip.push(
            {
                displayName: element.displayName,
                value: (typeof (element.value) === "string"
                    ? (element.value || 0).toString()
                    : (this.IBarChartSettings.units.decimalPlaces != null
                        ? parseFloat(element.value).toFixed(this.IBarChartSettings.units.decimalPlaces)
                        : element.value)),
            });
    });

    return tooltip;
}

private handleContextMenu(): void {
    // handle context menu
    this.svg.on('contextmenu', () => {
        const mouseEvent: MouseEvent = <MouseEvent>(d3Event);
        const emptySelection = {
            "measures": [],
            "dataMap": {
            }
        };

        this.selectionManager.showContextMenu(emptySelection, {
            x: mouseEvent.clientX,
            y: mouseEvent.clientY
        });
        mouseEvent.preventDefault();
    });
}

}
function getMetadataIndexFor(displayName: any, values: any) {
let i;

for (i = 0; i < values.length; i++) {

    if (values[i].displayName === displayName) {
        return i;
    }
}
return i;
}
function getIndexForDataMax(arr) {
if (arr.length < 1) {
    return 0;
}
let i = 0;
let p = 0;
let max = arr[i].value;
for (i = 1; i < arr.length; i++) {

    if (arr[i].value > max) {
        max = arr[i].value;
        p = i;
    }
}
return p;
}
function getIndexForCateMax(arr) {
if (arr.length < 1) {
    return -1;
}
let i = 0;
let p = 0;
let max = arr[i].currTextWidth;
for (i = 1; i < arr.length; i++) {

    if (arr[i].currTextWidth > max) {
        max = arr[i].currTextWidth;
        p = i;
    }
}
return p;
}
function getIndexForLabelMax(arr) {
if (arr.length < 1) {
    return -1;
}
let i = 0;
let p = 0;
let max = arr[i].LabelformattedValue ;
for (i = 1; i < arr.length; i++) {

    if (arr[i].LabelformattedValue > max) {
        max = arr[i].LabelformattedValue;
        p = i;
    }
}
return p;
}
