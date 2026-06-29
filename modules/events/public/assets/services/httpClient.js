/**
 * Shared HTTP client for all service modules.
 * Provides a single axios instance and processRequest utility
 * so the logic is not duplicated across every service file.
 */
var httpClient = (function () {
    const API_BASE = "/api";
    const _request = axios.create({});

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('[name="csrf-token"]').content
    };

    function processRequest(method, url, payload, headers, customApiUrl) {
        headers = headers || defaultHeaders;
        const endpoint = (customApiUrl || API_BASE) + url;
        const process = method.toLowerCase() === 'get'
            ? _request.get(endpoint, { headers })
            : _request[method](endpoint, payload, { headers });

        return process.then(function (response) {
            const errors = response.data.errors;
            if (errors) {
                if (typeof errors === "object" && !Object.keys(errors).length) {
                    return { state: true, data: response.data };
                }
                console.error("API Error: " + url, errors);
                return { state: false, data: response.data };
            }
            return { state: true, data: response.data };
        }).catch(function (error) {
            const errData = error.response && error.response.data;
            if (errData && errData.errors) console.error("API Error: " + url, errData.errors);
            return { state: false, data: errData };
        });
    }

    return {
        processRequest: processRequest,
        defaultHeaders: defaultHeaders
    };
})();
