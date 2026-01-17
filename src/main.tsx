import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// FullCalendar styles
import '@fullcalendar/core/index.css';
import '@fullcalendar/daygrid/index.css';
import '@fullcalendar/timegrid/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);