import { Selection, ContainerElement } from "d3-selection";
import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ITooltipService = powerbi.extensibility.ITooltipService;
export interface ITooltipEventArgs<TData> {
    data: TData;
    coordinates: number[];
    elementCoordinates: number[];
    context: HTMLElement;
    isTouchEvent: boolean;
}
export interface ITooltipServiceWrapper {
    addTooltip<T>(selection: Selection<d3.BaseType, any, d3.BaseType, any>, getTooltipInfoDelegate: (args: ITooltipEventArgs<T>) => VisualTooltipDataItem[], getDataPointIdentity: (args: ITooltipEventArgs<T>) => ISelectionId, reloadTooltipDataOnMouseMove?: boolean): void;
    hide(): void;
}
export declare function createTooltipServiceWrapper(tooltipService: ITooltipService, rootElement: ContainerElement, handleTouchDelay?: number): ITooltipServiceWrapper;
