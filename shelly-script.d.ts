declare function die(message: string): void;
declare function chr(num: number): string;
declare function print(...args: string[]): void;

type subscription_handle = any;
type timer_handle = any;
/**
 * Shelly APIs
 * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#shelly-apis
 */
declare const Shelly: {
    /**
     * To interact with the local device, JS code can invoke RPC methods using a "local" RPC channel. This method doesn't return a value. If invoked with invalid arguments the script is aborted. The signature of the method is:
     * @param method Name of the method to invoke
     * @param params Parameters
     * @param callback Function, will be invoked when the call completes
     */
    call(method: string, params: object | string, callback: (
        result: object | null | undefined,
        error_code: number,
        error_message: string,
        userdata: any
    ) => void): boolean

    /**
     * Allow JS code to react to internal events. Identical to the events reported through RPC notifications as NotifyEvent. Will be invoked when the respective event occurs.
     * @param callback Identical in contents to what NotifyEvent emit.
     * @param userdata Can be used to pass data from the invoker to the callback
     * @returns On success, returns a handle which can be used to remove the listener with Shelly.removeEventHandler(subscription_handle). If invoked with invalid arguments the script is aborted.
     */
    addEventHandler(callback: (event_data: object, userdata: any) => void, userdata: any): subscription_handle
    /**
     * Allow JS code to react to internal events. Identical to the events reported through RPC notifications as NotifyStatus. Will be invoked when the respective event occurs.
     * @param callback Identical in contents to what NotifyStatus emit.
     * @param userdata Can be used to pass data from the invoker to the callback
     * @returns On success, returns a handle which can be used to remove the listener with Shelly.removeStatusHandler(subscription_handle) respectively. If invoked with invalid arguments the script is aborted.
     */
    addStatusHandler(callback: (event_data: object, userdata: any) => void, userdata: any): subscription_handle

    /**
     * Takes a previously obtained subscription_handle
     * @param subscription_handle true if the handle is found and the listener is removed, false if handle is not found or undefined if the handle is invalid.
     */
    removeEventHandler(subscription_handle: subscription_handle): boolean | undefined
    /**
     * Takes a previously obtained subscription_handle
     * @param subscription_handle true if the handle is found and the listener is removed, false if handle is not found or undefined if the handle is invalid.
     */
    removeStatusHandler(subscription_handle: subscription_handle): boolean | undefined

    /**
     * This method creates an event which is broadcasted to all persistent RPC channels.
     * @param name Name of the event
     * @param data payload of the event. Any valid JSON value is allowed. undefined and function objects are not supported.
     */
    emitEvent(name: string, data: number | string | object | any[]): void

    /**
     * 
     * @param type_or_key Component type or key("component:id"). Component type must be in lowercase.
     * @param id Numeric id of multi instance components if only type is specified or absent for single instance components
     * @return an object with the current configuration of the component, null if component was not found. If invoked with invalid arguments the script is aborted.
     */
    getComponentConfig(type_or_key: string, id: number): object | null
    /**
     * 
     * @param type_or_key Component type or key("component:id"). Component type must be in lowercase.
     * @param id Numeric id of multi instance components if only type is specified or absent for single instance components
     * @return an object with the current status of the component, null if component was not found. If invoked with invalid arguments the script is aborted.
     */
    getComponentStatus(type_or_key: string, id: number): object | null

    /**
     * @returns the DeviceInfo object.
     * @see https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Shelly/#shellygetdeviceinfo
     */
    getDeviceInfo(): object
    /**
     * @returns number - the id of the current script.
     */
    getCurrentScriptId(): number
}

/**
 * Timers can be used for one-shot delayed code execution, or to run some code periodically.
 * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#timer
 */
declare const Timer: {
    /**
     * To arm a timer, use:
     * @param period In milliseconds
     * @param repeat If true, the timer will fire periodically, otherwise the callback will be invoked only once
     * @param callback To be invoked when the timer fires
     * @param userdata Can be used to pass data from the invoker to the callback
     * @returns On success, returns a handle which can be used to stop the timer with Timer.clear(timer_handle). If invoked with invalid arguments the script is aborted.
     */
    set(period: number, repeat: boolean, callback: Function, userdata: any): timer_handle
    /**
     * To stop the execution of a timer, use:
     * @param timer_handle handle previously returned by Timer.set()
     * @returns true if the timer was armed and destroyed, false if no such timer existed or undefined if the given timer_handle was not valid.
     */
    clear(timer_handle: timer_handle): boolean | undefined
}

/**
 * MQTT is a global object which allows to access mqtt functionality. JS code can monitor connection status, subscribe to miltiple topics and publish to topics.
 * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#mqtt-support
 */
declare const MQTT: {
    /**
     * @returns true if device is connected to a MQTT broker or false otherwise.
     */
    isConnected(): boolean;
    /**
     * Subscribe to a topic on the MQTT broker.
     * @param topic The topic to subscribe to
     * @param callback Function to be called when a message is published on the topic
     * @param callback_arg User data to be passed to the callback
     */
    subscribe(topic: string, callback: (topic: string, message: string, callback_arg: any) => void, callback_arg: any): void
    /**
     * Unsubscribe from a topic previously subscribed, can be called only for topics subscribed in the same script.
     * @param topic The topic to unsubscribe from
     * @returns true if topic is subscribed to and unsubscribed or false if subscription to the topic does not exist. The script is aborted if the argument is not valid.
     */
    unsubscribe(topic: string): boolean
    /**
     * publish a message to a topic.
     * @param topic The topic to publish
     * @param message Тhe message to publish
     * @param qos Can be 0 - at most once, 1 - at least once or 2 exactly once. Optional, default is 0
     * @param retain If true the message is retained by the broker and delivered when subscribers are activated. Optional, default is false
     */
    publish(topic: string, message: string, qos?: number, retain?: boolean): void
    /**
     * Registers a handler for the MQTT connection established event.
     * This method doesn't return a value. If invoked with invalid arguments the script is aborted.
     * @param callback Function to be called when event is received
     * @param callback_arg User data to be passed to the callback
     */
    setConnectHandler(callback: (callback_arg: void) => void, callback_arg: any): void
    /**
     * registers a handler for the MQTT connection closed event. This method doesn't return a value. If invoked with invalid arguments the script is aborted.
     * @param callback Function to be called when event is received
     * @param callback_arg User data to be passed to the callback
     */
    setDisconnectHandler(callback: (callback_arg: void) => void, callback_arg: any): void
}

interface ble_subscribe_callback_t {
    event: typeof BLE.Scanner.SCAN_START
    | typeof BLE.Scanner.SCAN_STOP
    | typeof BLE.Scanner.SCAN_RESULT,
    result: null | {
        addr: string
        addr_type: number
        advData: string
        scanRsp: string
        rssi: number
        flags: number
        local_name: string
        manufacturer_data: object
        service_uuids: string[]
        service_data: object
        tx_power_level: number
    }
}

/**
 * A global BLE object provides a namespace for for various different layers of the bluetooth protocol stack. Shelly devices currently support the scanner role.
 * caution: Bluetooth support in scripting is experimental. The API is subject to change.
 * @since 0.12.0
 * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#bluetooth-support
 */
declare class BLE {
    /**
     * The Scanner object provides access to functionality related to the discovery of bluetooth devices. It allows the script to start a scan and listen for scan events. It defines the following constants:
     * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#blescanner
     */
    static Scanner: {
        SCAN_START: 0
        SCAN_STOP: 1
        SCAN_RESULT: 2
        INFINITE_SCAN: -1

        /**
         * Subscribe for scan events and register a listener. A script must subscribe in order to receive events, can subscribe at any time, regardless of the status of the scan or previous subscription. Only one subscription can be active in a script and previous subscriptions are replaced by a new one.
         * This method doesn't return a value. If invoked with invalid arguments the script is aborted.
         * @param callback Function invoked for each scan event. Specify null to unsubscribe. Required
         * @param callback_arg User data passed in the call
         */
        subscribe(callback: (event: ble_subscribe_callback_t | null) => void, callback_arg: any): void
        /**
         * Start a scan and optionally subscribe for scan events.
         * Scan options allow tuning for scan timings, but some restrictions apply:
         * 1. scan window cannot be longer than 1/3 of scan interval
         * 2. the maximum scan window is 50 ms, but 30 ms seems to be optimal
         * 3. duration must be at least 3 scan intervals long
         * If these conditions are not met scanning will not start. In the future, some of these options may not be tunable or the device may choose to modify them for performance and compatibility with other firmware features. It is best to use defaults.
         * To run a perpetual scan, supply a single option: {duration_ms: BLE.Scanner.INFINITE_SCAN}.
         * @param options object with scan options. All options are optional and may be omitted, substituting with defaults. Required
         * @param callback Function invoked for each scan event. If specified the call will also subscribe for scan events. Optional
         * @param callback_arg User data passed in the call
         * @returns object with the options of the started scan or null if start failed. Start will fail also if there is a scan in progress. If invoked with invalid arguments the script is aborted.
         */
        Start(options: Partial<{
            duration_ms: number
            active: boolean
            interval_ms: number
            window_ms: number
        }>, callback?: (event: ble_subscribe_callback_t | null) => void, callback_arg?: any): object | null
        /**
         * Stops a running scan. Only the script that started the scan can stop it.
         * @returns true if scan is successfully stopped or false if there is an error.
         */
        Stop(): boolean
        /**
         * @returns true if currently there is a running scan or false otherwise.
         */
        isRunning(): boolean
        /**
         * @returns object with the options of the running scan if there is one or the default options otherwise.
         */
        GetScanOptions(): object
    }

    /**
     * The GAP object is responsible for the GAP layer of the bluetooth protocol. It provides helper functions for parsing advertisement data. It defines the following constants:
     * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#blegap
     */
    static GAP: {
        ADDRESS_TYPE_PUBLIC: 1,
        ADDRESS_TYPE_RANDOM_STATIC: 2
        ADDRESS_TYPE_RANDOM_NON_RESOLVABLE: 3
        ADDRESS_TYPE_RANDOM_RESOLVABLE: 4
        EIR_FLAGS: 0x1
        EIR_SERVICE_16_INCOMPLETE: 0x2
        EIR_SERVICE_16: 0x3
        EIR_SERVICE_32_INCOMPLETE: 0x4
        EIR_SERVICE_32: 0x5
        EIR_SERVICE_128_INCOMPLETE: 0x6
        EIR_SERVICE_128: 0x7
        EIR_SHORT_NAME: 0x8
        EIR_FULL_NAME: 0x9
        EIR_TX_POWER_LEVEL: 0xA
        EIR_DEVICE_ID: 0x10
        EIR_SERVICE_DATA_16: 0x16
        EIR_SERVICE_DATA_32: 0x20
        EIR_SERVICE_DATA_128: 0x21
        EIR_URL: 0x24
        EIR_MANUFACTURER_SPECIFIC_DATA: 0xff

        /**
         * Parse manufacturer data from advertisement data or scan response.
         * @returns extracted data, may be empty string if data is not available. If invoked with invalid arguments the script is aborted.
         * @param data data to parse, should be either advertisement data or scan response. Required
         */
        parseName(data: string): string
        /**
         * Parse manufacturer data from advertisement data or scan response.
         * @param data extracted data, may be empty string if data is not available. If invoked with invalid arguments the script is aborted.
         */
        parseManufacturerData(data: string): string
        /**
         * Parse data for specified EIR type (Extended Inquiry Response) from advertisement data or scan response.
         * @param data data to parse, should be either advertisement data or scan response. Required
         * @param type EIR type, should be one of the defined constants. Required
         * @returns extracted data, may be empty string if data is not available. If invoked with invalid arguments the script is aborted. 
         */
        ParseDataByEIRType(data: string, type: number): string
        /**
         * Search for specified service UUID in the advertisement data or scan response.
         * @param data data to parse, should be either advertisement data or scan response. Required
         * @param uuid service UUID to check. Required
         * @returns true if advertisement data or scan response lists the specified service uuid or false otherwise. If invoked with invalid arguments the script is aborted.
         */
        HasService(data: string, uuid: number): boolean
        /**
         * Parse service data string for the specified service UUID if present in the advertisement data or scan response.
         * @param data data to parse, should be either advertisement data or scan response. Required
         * @param uuid service UUID to check. Required
         */
        ParseServiceData(data: string, uuid: number): string
    }
}

/**
 * HTTPServer is a global object which allows a script to register handlers to incoming HTTP requests on specific to the script endpoints. The URL of the endpoint follows the format http://<SHELLY_IP>/script/<script_id>/<endpoint_name>.
 * @see https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures/#http-handlers
 */
declare const HTTPServer: {
    /**
     * registers an endpoint with a corresponding handler
     * @param endpoint_name The name of the endpoint to register
     * @param callback Function to be called when a request comes on the registered endpoint
     * @param callback_arg User data to be passed to the callback
     * @returns the part of the endpoint URL following the SHELLY_IP. The script is aborted if the arguments are not valid.
     */
    registerEndpoint(endpoint_name: string, callback: (
        request: {
            method: string
            query?: string
            headers: string
            body?: string
        },
        response: {
            cody?: number
            body?: string
            headers?: any[]
            send: () => boolean
        },
        callback_arg: any
    ) => void, callback_arg: any): string
}