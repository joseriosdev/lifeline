const ITEM_HEIGHT = 40; // Height of each item in pixels
const ROLLER_HEIGHT = 200; // Visible height of the container

const nextDaylightSavings = [
    { date: new Date('November 1, 2025'), willTimeBeAligned: true },
    { date: new Date('March 8, 2026'), willTimeBeAligned: false },
    { date: new Date('November 1, 2026'), willTimeBeAligned: true },
    { date: new Date('March 14, 2027'), willTimeBeAligned: false },
    { date: new Date('November 7, 2027'), willTimeBeAligned: false }
];


// Current date reference for calculating the range 
// NOTE: Using a fixed date for reliable local testing, otherwise use new Date()
const currentDate = new Date();
const nextEvent = nextDaylightSavings.find(event => event.date <= currentDate);

let timeAligned;

if (nextEvent) {
    timeAligned = nextEvent.willTimeBeAligned;
} else {
    timeAligned = true;
    console.log('No future daylight savings event found in the list. Default is TimeAligned: true');
}

const CALL_TIME_CYCLE = timeAligned ? ['13:00', '10:00', '15:00', '8:00'] : ['12:00', '9:00', '14:00', '7:00'];
const TIME_CYCLE_MAP = Object.freeze({
    '7:00': '7AM',
    '8:00': '8AM',
    '9:00': '9AM',
    '10:00': '10AM',
    '12:00': '12PM',
    '13:00': '1PM',
    '14:00': '2PM',
    '15:00': '3PM'
});

// Calculate start date: 1st day of the month one month ago
const START_DATE = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); 

// --- Data Generation ---

function getDatesAndTimes() {
    const dates = [];
    let d = new Date(START_DATE);
    
    // End date: Last day of the month 7 months in the future
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 7, 0); 

    let dayIndex = 0;
    while (d <= endDate) {
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();

        // Calculate call time based on the cycle
        const cycleIndex = dayIndex % CALL_TIME_CYCLE.length;
        const callTime = CALL_TIME_CYCLE[cycleIndex];
        
        dates.push({
            date: new Date(d),
            dayLabel: `${day} ${d.toLocaleDateString('es-ES', { month: 'short' })}`,
            callTime: callTime,
            id: `${year}-${month}-${day}`
        });

        d.setDate(d.getDate() + 1);
        dayIndex++;
    }
    return dates;
}

const ALL_DATES_AND_TIMES = getDatesAndTimes();

// --- Roller Implementation ---

class Roller {
    constructor(containerId, rollerId, items) {
        this.container = document.getElementById(containerId);
        this.roller = document.getElementById(rollerId);
        this.items = items;
        this.itemCount = items.length;
        this.itemHeight = ITEM_HEIGHT;
        this.containerHeight = ROLLER_HEIGHT;
        this.position = 0; // Current Y translation in pixels
        this.isDragging = false;
        this.startY = 0;
        this.lastY = 0;
        this.velocity = 0;
        this.rafId = null;

        this.render();
        this.addListeners();
    }

    render() {
        this.roller.innerHTML = this.items.map((item, index) => `
            <div class="roller-item" data-index="${index}">
                ${this.roller.id === 'day-roller' ? item.dayLabel : item.callTime}
            </div>
        `).join('');
    }

    // --- Event Handlers ---

    startDrag = (e) => {
        // Only allow one roller to start the drag, but flag both
        this.isDragging = true;
        
        // Disable snapping transitions globally while dragging
        dayRoller.roller.style.transition = 'none';
        hourRoller.roller.style.transition = 'none';
        
        this.startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        this.lastY = this.startY;
        this.velocity = 0;
        e.preventDefault();
        
        // Add global listeners for mouse up/move
        if (e.type === 'mousedown') {
            document.addEventListener('mousemove', globalDrag);
            document.addEventListener('mouseup', globalEndDrag);
        }
    }

    // Public method to set position (used by globalDrag)
    setPosition(deltaY) {
        this.position += deltaY;

        // Bounds check 
        const maxPos = 0;
        const minPos = -((this.itemCount - 1) * this.itemHeight);
        this.position = Math.max(minPos, Math.min(maxPos, this.position));

        this.roller.style.transform = `translateY(${this.position}px)`;
    }

    // --- Snapping and Focus ---

    snapToNearest() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        // Calculate target index 
        let targetIndex = Math.round(this.position / this.itemHeight);
        
        // Target position (needs to be negative or zero)
        const snappedPosition = targetIndex * this.itemHeight;
        
        // Apply the snap with a smooth transition
        this.roller.style.transition = 'transform 0.15s ease-out';
        this.position = snappedPosition;
        this.roller.style.transform = `translateY(${this.position}px)`;
        
        // Final update after snap
        setTimeout(() => this.updateFocus(false), 150);
    }

    updateFocus(isDragging) {
        // Calculate the index of the item currently in the center
        const centeredIndex = -Math.round(this.position / this.itemHeight);
        
        this.roller.querySelectorAll('.roller-item').forEach((item, index) => {
            const isFocused = index === centeredIndex;
            item.classList.toggle('focused', isFocused);
        });
        
        if (!isDragging) {
            this.selectedIndex = centeredIndex;
            globalUpdate();
        }
    }

    addListeners() {
        // Mouse listeners
        this.roller.addEventListener('mousedown', this.startDrag);
        // Touch listeners
        this.roller.addEventListener('touchstart', this.startDrag);
        this.roller.addEventListener('touchmove', globalDrag);
        this.roller.addEventListener('touchend', globalEndDrag);
    }
    
    // Public method to scroll to a specific index (used for initializing to current date)
    scrollToIndex(index) {
        this.position = -index * this.itemHeight;
        this.roller.style.transform = `translateY(${this.position}px)`;
        this.updateFocus(false);
    }
}

// --- Initialization and Global Logic ---

let dayRoller, hourRoller;
const selectedOutput = document.getElementById('selected-output');

// Global variable to hold the roller that initiated the drag (used to calculate deltaY)
let activeRollerSource = null;

function globalUpdate() {
    if (!dayRoller || !hourRoller) return;
    
    const selectedDateIndex = dayRoller.selectedIndex;
    const selectedData = ALL_DATES_AND_TIMES[selectedDateIndex];
    
    const dateStr = selectedData.date.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    selectedOutput.innerHTML = `
        <span class="text-3xl block">${dateStr}</span>
        <span class="text-6xl font-black text-[#4dc0b5] block">${`${selectedData.callTime} / ${TIME_CYCLE_MAP[selectedData.callTime]}`}</span>
    `;
}

// Synchronized Drag Logic
const globalDrag = (e) => {
    // Determine the roller that initiated the drag
    if (dayRoller.isDragging && !activeRollerSource) activeRollerSource = dayRoller;
    if (hourRoller.isDragging && !activeRollerSource) activeRollerSource = hourRoller;
    if (!activeRollerSource) return;

    const currentY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    const deltaY = currentY - activeRollerSource.lastY;
    
    // Apply position change to BOTH rollers
    dayRoller.setPosition(deltaY);
    hourRoller.setPosition(deltaY);
    
    activeRollerSource.velocity = deltaY;
    activeRollerSource.lastY = currentY;

    // Update focus display on one roller (syncs the other)
    dayRoller.updateFocus(true);
}

// Synchronized End Drag Logic
const globalEndDrag = (e) => {
    if (!activeRollerSource) return;

    // Remove global listeners
    if (e.type === 'mouseup') {
        document.removeEventListener('mousemove', globalDrag);
        document.removeEventListener('mouseup', globalEndDrag);
    }
    
    // Clear dragging flags
    const finalVelocity = activeRollerSource.velocity;
    dayRoller.isDragging = false;
    hourRoller.isDragging = false;
    activeRollerSource = null;

    if (Math.abs(finalVelocity) > 1) {
        // Apply inertia to one roller (which updates the position for both)
        startInertia(dayRoller, finalVelocity);
    } else {
        // Snap both rollers simultaneously (by snapping the master roller)
        dayRoller.snapToNearest();
        hourRoller.snapToNearest();
    }
}

// Inertia Animation for Synchronized Rollers
function startInertia(rollerInstance, initialVelocity) {
    const friction = 0.95; 
    let velocity = initialVelocity;
    
    const animate = () => {
        if (dayRoller.isDragging || hourRoller.isDragging) {
            cancelAnimationFrame(rollerInstance.rafId);
            return;
        }

        velocity *= friction;

        // Apply velocity to BOTH rollers
        dayRoller.setPosition(velocity);
        hourRoller.setPosition(velocity);

        if (Math.abs(velocity) < 0.2) {
            dayRoller.snapToNearest();
            hourRoller.snapToNearest();
            return;
        }

        dayRoller.updateFocus(true);
        rollerInstance.rafId = requestAnimationFrame(animate);
    };

    rollerInstance.rafId = requestAnimationFrame(animate);
}

function initApp() {
    // 1. Initialize Rollers
    dayRoller = new Roller('day-roulette-container', 'day-roller', ALL_DATES_AND_TIMES);
    hourRoller = new Roller('hour-roulette-container', 'hour-roller', ALL_DATES_AND_TIMES);
    
    // 2. Set Initial Position to Today's Date
    const todayId = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
    const todayIndex = ALL_DATES_AND_TIMES.findIndex(item => item.id === todayId);
    
    if (todayIndex !== -1) {
        // Scroll both rollers to the index corresponding to the current date
        dayRoller.scrollToIndex(todayIndex);
        hourRoller.scrollToIndex(todayIndex);
    } else {
        // Fallback to the first item if current date is outside range
        dayRoller.scrollToIndex(0);
        hourRoller.scrollToIndex(0);
    }

    // 3. Start Current Time Clock
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
}

// --- Current Time Clock ---

function updateCurrentTime() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    
    const datePart = now.toLocaleDateString('es-ES', dateOptions);
    const timePart = now.toLocaleTimeString('es-ES', timeOptions);
    
    document.getElementById('current-datetime').textContent = `${datePart} ${timePart}`;
}

// Start the application after the DOM is loaded
window.onload = initApp;
