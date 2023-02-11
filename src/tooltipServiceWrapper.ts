import {
    Selection,
    event as d3Event,
    select as d3Select,
    touches as d3Touches,
    ContainerElement,
} from "d3-selection";
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
    addTooltip<T>(
        selection: Selection<d3.BaseType, any, d3.BaseType, any>,
        getTooltipInfoDelegate: (args: ITooltipEventArgs<T>) => VisualTooltipDataItem[],
        getDataPointIdentity: (args: ITooltipEventArgs<T>) => ISelectionId,
        reloadTooltipDataOnMouseMove?: boolean): void;
    hide(): void;
}

const DefaultHandconstouchDelay = 1000;

export function createTooltipServiceWrapper(
    tooltipService: ITooltipService,
    rootElement: ContainerElement,
    handconstouchDelay: number = DefaultHandconstouchDelay): ITooltipServiceWrapper {
    return new TooltipServiceWrapper(tooltipService, rootElement, handconstouchDelay);
}

class TooltipServiceWrapper implements ITooltipServiceWrapper {
    private handconstouchTimeoutId: number| ReturnType<typeof setTimeout> = null;
    private visualHostTooltipService: ITooltipService;
    private rootElement: ContainerElement;
    private handconstouchDelay: number;

    constructor(tooltipService: ITooltipService, rootElement: ContainerElement, handconstouchDelay: number) {
        this.visualHostTooltipService = tooltipService;
        this.handconstouchDelay = handconstouchDelay;
        this.rootElement = rootElement;
    }
    private static touchStartEventName(): string {
        let eventName = "touchstart";

        if (window["PointerEvent"]) {
            // IE11
            eventName = "pointerdown";
        }

        return eventName;
    }

    private static touchMoveEventName(): string {
        let eventName = "touchmove";

        if (window["PointerEvent"]) {
            // IE11
            eventName = "pointermove";
        }

        return eventName;
    }

    private static touchEndEventName(): string {
        let eventName = "touchend";

        if (window["PointerEvent"]) {
            // IE11
            eventName = "pointerup";
        }

        return eventName;
    }

    private static usePointerEvents(): boolean {
        const eventName = TooltipServiceWrapper.touchStartEventName();
        return eventName === "pointerdown" || eventName === "MSPointerDown";
    }

    public addTooltip<T>(
        selection: Selection<d3.BaseType, any, d3.BaseType, any>,
        getTooltipInfoDelegate: (args: ITooltipEventArgs<T>) => VisualTooltipDataItem[],
        getDataPointIdentity: (args: ITooltipEventArgs<T>) => ISelectionId,
        reloadTooltipDataOnMouseMove?: boolean): void {

        if (!selection || !this.visualHostTooltipService.enabled()) {
            return;
        }

        const rootNode = this.rootElement;

        // Mouse events
        selection.on("mouseover.tooltip", () => {
            // Ignore mouseover while handling touch events
            if (!this.canDisplayTooltip(d3Event)) {
                return;
            }

            const tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, true, false);
            if (!tooltipEventArgs) {
                return;
            }
            const tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
            if (tooltipInfo == null) {
                return;
            }

            const selectionId = getDataPointIdentity(tooltipEventArgs);

            this.visualHostTooltipService.show({
                coordinates: tooltipEventArgs.coordinates,
                dataItems: tooltipInfo,
                identities: selectionId ? [selectionId] : [],
                isTouchEvent: false,
            });
        });

        selection.on("mouseout.tooltip", () => {
            this.visualHostTooltipService.hide({
                immediately: false,
                isTouchEvent: false,
            });
        });

        selection.on("mousemove.tooltip", () => {
            // Ignore mousemove while handling touch events
            if (!this.canDisplayTooltip(d3Event)) {
                return;
            }

            const tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, true, false);
            if (!tooltipEventArgs) {
                return;
            }

            let tooltipInfo: VisualTooltipDataItem[];
            if (reloadTooltipDataOnMouseMove) {
                tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                if (tooltipInfo == null) {
                    return;
                }
            }

            const selectionId = getDataPointIdentity(tooltipEventArgs);

            this.visualHostTooltipService.move({
                coordinates: tooltipEventArgs.coordinates,
                dataItems: tooltipInfo,
                identities: selectionId ? [selectionId] : [],
                isTouchEvent: false,
            });
        });

        // --- Touch events ---

        const touchStartEventName: string = TooltipServiceWrapper.touchStartEventName();
        const touchEndEventName: string = TooltipServiceWrapper.touchEndEventName();
        const isPointerEvent: boolean = TooltipServiceWrapper.usePointerEvents();

        selection.on(touchStartEventName + ".tooltip", () => {
            this.visualHostTooltipService.hide({
                isTouchEvent: true,
                immediately: true,
            });

            const tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, isPointerEvent, true);
            if (!tooltipEventArgs) {
                return;
            }

            const tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
            const selectionId = getDataPointIdentity(tooltipEventArgs);

            this.visualHostTooltipService.show({
                coordinates: tooltipEventArgs.coordinates,
                dataItems: tooltipInfo,
                identities: selectionId ? [selectionId] : [],
                isTouchEvent: true,
            });
        });

        selection.on(touchEndEventName + ".tooltip", () => {
            this.visualHostTooltipService.hide({
                immediately: false,
                isTouchEvent: true,
            });

            if (this.handconstouchTimeoutId) {
                clearTimeout(this.handconstouchTimeoutId);
            }
            // At the end of touch action, set a timeout that will const us ignore the incoming mouse events for a small amount of time
            // TODO: any better way to do this?
            this.handconstouchTimeoutId = setTimeout(() => {
                this.handconstouchTimeoutId = undefined;
            }, this.handconstouchDelay);
        });
    }

    public hide(): void {
        this.visualHostTooltipService.hide({ immediately: true, isTouchEvent: false });
    }

    private makeTooltipEventArgs<T>(
        rootNode: ContainerElement,
        isPointerEvent: boolean,
        isTouchEvent: boolean): ITooltipEventArgs<T> {
        const target = <HTMLElement> (<Event> d3Event).target;
        const data: T = d3Select<HTMLElement, T>(target).datum();

        const mouseCoordinates = this.getCoordinates(rootNode, isPointerEvent);
        const elementCoordinates: number[] = this.getCoordinates(target, isPointerEvent);
        const tooltipEventArgs: ITooltipEventArgs<T> = {
            data,
            context: target,
            coordinates: mouseCoordinates,
            elementCoordinates: elementCoordinates,
            isTouchEvent: isTouchEvent,
        };

        return tooltipEventArgs;
    }

    private canDisplayTooltip(d3Event: any): boolean {
        let canDisplay = true;
        const mouseEvent: MouseEvent = <MouseEvent> d3Event;
        if (mouseEvent.buttons !== undefined) {
            // Check mouse buttons state
            const hasMouseButtonPressed = mouseEvent.buttons !== 0;
            canDisplay = !hasMouseButtonPressed;
        }

        // Make sure we are not ignoring mouse events immediately after touch end.
        canDisplay = canDisplay && (this.handconstouchTimeoutId == null);

        return canDisplay;
    }

    private getCoordinates(rootNode: ContainerElement, isPointerEvent: boolean): number[] {
        let coordinates: number[];

        if (isPointerEvent) {
            // copied from d3_eventSource (which is not exposed)
            const e = <any> d3Event;


            const rect = rootNode.getBoundingClientRect();
            coordinates = [e.clientX - rect.left - rootNode.clientLeft, e.clientY - rect.top - rootNode.clientTop];
        }
        else {
            const touchCoordinates = d3Touches(rootNode);
            if (touchCoordinates && touchCoordinates.length > 0) {
                coordinates = touchCoordinates[0];
            }
        }

        return coordinates;
    }


}
