const dev = "https://usstaging.ivisecurity.com";
const prod = "https://prod.ivisecurity.com";
const local = "http://192.168.0.225";

export const environment = {
    login_url: `${dev}/userDetails`,
    site_url: `${dev}/vipsites`,
    metadata_url: `${dev}/metadata`,
    common_url: `${dev}/common`,
    guard_monitoring_url: `${dev}/guard_monitoring`,
    events_url: `https://stagingmq.ivisecurity.com/queueManagement`,
    event_process_url: `${dev}/events_data`,

    // login_url: `${prod}/userDetails`,
    // site_url: `${prod}/vipsites`,
    // metadata_url: `${prod}/metadata`,
    // guard_monitoring_url: `${prod}/guard_monitoring`,
    // events_url: `https://prodmq.ivisecurity.com/queueManagement`,
    // event_process_url: `${prod}/events_data`,

    // login_url: `${prod}/userDetails_test`,
    // site_url: `${prod}/vipsites_test`,
    // metadata_url: `${prod}/metadata`,
    // guard_monitoring_url: `${prod}/guard_monitoring_test`,
    // events_url: `https://prodmq.ivisecurity.com/queueManagement_test`,
    // event_process_url: `${prod}/events_data_test`,
};
