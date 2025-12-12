const dev = "https://usstaging.ivisecurity.com";

const local = "http://192.168.0.225";

const prod = "https://prod.ivisecurity.com";


export const environment = {
    login_url: `${dev}/userDetails`,
    site_url: `${dev}/vipsites`,
    common_url: `${dev}/metadata`,
    guard_monitoring_url: `${dev}/guard_monitoring`,
    event_process_url: `${dev}/events_data`,
    events_url: `https://stagingmq.ivisecurity.com/queueManagement`,

    // login_url: `${prod}:5551/userDetails`,
    // site_url: `${prod}:5552/vipsites`,
    // common_url: `${prod}:8844/metadata`,
    // guard_monitoring_url: `${prod}:5553/guard_monitoring`,
    // events_url: `https://prodmq.ivisecurity.com/queueManagement`,
};
