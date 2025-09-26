import './Tile.css';
import { Fragment } from "react/jsx-runtime";

const Tile = () => {
    return (
        <Fragment>
            <div>
                <div className="camera-feeds">
                    <div className="camera">
                        <img src="images/camera.png" alt="Camera Feed 1" />
                        <div className="camera-id">MLD049C3</div>
                    </div>
                    <div className="camera">
                        <img src="images/camera.png" alt="Camera Feed 2" />
                        <div className="camera-id">MLD049C4</div>
                    </div>
                </div>

                <div className="store-info">
                    <p>RELIANCE STORE - TADEPALLY (1234567)</p>
                    <p>Tadepally, Guntur District, Andhra Pradesh, INDIA - 500503</p>

                    <div className="activity-box">
                        <div>
                            <strong>PLAN SITE ACTIVITY</strong><br />
                            <span>31 JUL, 2025 13:30 PM - 31 JUL, 2025 14:10 PM</span>
                        </div>
                        <div>
                            <strong>Early logout</strong><br />
                            <span>Description display here Description display here Description display here</span>
                        </div>
                    </div>
                </div>

                <div className="monitoring">
                    <h4>MONITORING</h4>
                    <table>
                        <tbody>
                            <tr>
                                <td><strong>Timezone</strong></td>
                                <td>CST</td>
                            </tr>
                            <tr>
                                <td><strong>Monitoring</strong></td>
                                <td>
                                    Mon-Sat: 00:00 AM - 06:00 AM & 21:00 PM - 23:59 PM<br />
                                    Sun: 00:00 AM - 23:59 PM
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Camera</strong></td>
                                <td>MLD049 - C3</td>
                            </tr>
                            <tr>
                                <td><strong>Requirements</strong></td>
                                <td>Homelessness, Loitering, Suspicious activity, Trash, Break-Ins.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </Fragment>
    )
}

export default Tile;