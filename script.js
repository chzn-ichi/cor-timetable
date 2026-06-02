// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let originalCourses = [];
let currentCourses = [];
let currentStudent = {};
let currentEditingCourse = null;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    fileInput.addEventListener('change', handleFileUpload);
    resetBtn.addEventListener('click', resetToOriginal);
    exportBtn.addEventListener('click', exportAsHTML);
    
    showDemoGrid();
});

function showDemoGrid() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = [];
    for (let hour = 0; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        times.push(`${displayHour}:00 ${period}`);
    }
    
    let html = '<div class="timetable-wrapper">';
    html += '<table class="timetable">';
    html += '<thead><tr><th class="time-col">Time</th>';
    days.forEach(day => { html += `<th>${day}</th>`; });
    html += '</thead><tbody>';
    
    times.forEach(time => {
        html += `<tr class="time-row" style="height: 70px;">`;
        html += `<td class="time-slot"><strong>${time}</strong></td>`;
        days.forEach(() => {
            html += `<td class="empty-cell" style="height: 70px;"></td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody>`;
    html += `</table>`; 
    html += `</div>`;
    
    html += `<div style="margin-top: 20px; padding: 12px; background: #fffbeb; border-radius: 12px; color: #92400e; font-size: 0.75rem; text-align: center; border: 1px solid #fde68a;">
                <strong>📌 Demo Mode:</strong> Upload your COR PDF (IT or CE) to see your actual schedule.
             </div>`;
    
    document.getElementById('timetableGrid').innerHTML = html;
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading(true);
    document.getElementById('timetableContainer').style.display = 'block';
    clearStatus();
    
    try {
        const courses = await parseCOR(file);
        
        if (courses.length === 0) {
            showStatus('No courses found. The PDF format might be different.', 'error');
            showDemoGrid();
            return;
        }
        
        originalCourses = JSON.parse(JSON.stringify(courses));
        currentCourses = JSON.parse(JSON.stringify(courses));
        
        renderTimetableGrid();
        showStudentInfo();
        showStatus(`✅ Loaded ${courses.length} courses! Click any class to edit.`, 'success');
        
    } catch (error) {
        console.error('Parse error:', error);
        showStatus('Error parsing PDF.', 'error');
        showDemoGrid();
    } finally {
        showLoading(false);
    }
}

async function parseCOR(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map(item => item.str);
    
    // Extract student info
    for (let i = 0; i < textItems.length; i++) {
        if (textItems[i] === 'Name:') {
            currentStudent.name = textItems[i+1] || '';
        }
        if (textItems[i] === 'Program:') {
            currentStudent.program = textItems[i+1] || '';
        }
        if (textItems[i] === 'Student No:') {
            currentStudent.studentNo = textItems[i+1] || '';
        }
    }
    
    const courses = [];
    
    let i = 0;
    while (i < textItems.length) {
        const item = textItems[i].trim();
        
        if (!item || item.length < 2) {
            i++;
            continue;
        }
        
        const isFalsePositive = (
            item === 'CODE' || item === 'SUBJECT' || item === 'TITLE' ||
            item === 'UNITS' || item === 'SECTION' || item === 'SCHEDULE' ||
            item === 'ROOM' || item === 'FACULTY' || item === 'Total' ||
            item === 'Lec' || item === 'Lab' || item === 'Credit' ||
            item.match(/^Fee$|^FEE$|^Amount$|^DISCOUNT$|^TOTAL$|^PAYMENT$|^Prelim$|^Midterm$|^Prefinal$|^Final$/) ||
            item.match(/^\d+\.\d{2}$/)
        );
        
        if (isFalsePositive) {
            i++;
            continue;
        }
        
        const isCourseCode = (
            /^[A-Z]{2,6}\s?\d{1,4}$/i.test(item) ||
            /^[A-Z]{2,8}$/i.test(item)
        );
        
        if (isCourseCode && item.length < 15) {
            let schedule = '';
            let scheduleIndex = i;
            let subject = '';
            let section = '';
            let faculty = '';
            
            if (textItems[i+1] && !textItems[i+1].match(/^\d/) && textItems[i+1].length > 2) {
                subject = textItems[i+1];
                if (textItems[i+2] && !textItems[i+2].match(/^\d/) && textItems[i+2].length > 2 && textItems[i+2].length < 30) {
                    subject += ' ' + textItems[i+2];
                }
            }
            
            for (let j = i+2; j < Math.min(i+10, textItems.length); j++) {
                const potential = textItems[j] || '';
                if (potential.match(/^[A-Z]{2,4}\d+R\d+$/i) || potential.match(/^[A-Z]{3,10}_[A-Z]{2,4}_\d+[A-Z]?$/i)) {
                    section = potential;
                    break;
                }
            }
            
            for (let j = i+2; j < Math.min(i+15, textItems.length); j++) {
                const potential = textItems[j] || '';
                if (potential.match(/(M|T|W|Th|F|S|TF|MTh|MWF|TTh)\s+\d{1,2}:\d{2}\s*[AP]M/)) {
                    schedule = potential;
                    scheduleIndex = j;
                    break;
                }
            }
            
            if (!schedule && item.match(/(M|T|W|Th|F|S|TF|MTh|MWF|TTh)\s+\d{1,2}:\d{2}\s*[AP]M/)) {
                schedule = item;
                scheduleIndex = i;
                const schedulePart = item.replace(/^[A-Z]{2,6}\s?\d{1,4}/i, '').trim();
                if (schedulePart && !subject) {
                    subject = schedulePart;
                }
            }
            
            if (scheduleIndex + 1 < textItems.length && textItems[scheduleIndex + 1]) {
                faculty = textItems[scheduleIndex + 1];
                if (textItems[scheduleIndex + 2] && textItems[scheduleIndex + 2].match(/^[A-Z]/) && textItems[scheduleIndex + 2].length > 3) {
                    faculty += ' ' + textItems[scheduleIndex + 2];
                }
            }
            
            const dayMatch = schedule.match(/^(M|T|W|Th|F|TF|MTh|MWF|TTh)/i);
            const timeMatch = schedule.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
            
            let room = '';
            const roomMatch = schedule.match(/\(([^)]+)\)/);
            if (roomMatch) {
                room = roomMatch[1];
            } else {
                const simpleRoom = schedule.match(/\d{2,3}-\d{3,4}/);
                if (simpleRoom) room = simpleRoom[0];
                const modularRoom = schedule.match(/Modular Classroom\s*\d+/i);
                if (modularRoom) room = modularRoom[0];
                const labRoom = schedule.match(/CITC\s*Lab\s*\d+/i);
                if (labRoom) room = labRoom[0];
                const ciscoRoom = schedule.match(/Cisco\s*Lab\s*\d+/i);
                if (ciscoRoom) room = ciscoRoom[0];
            }
            
            if (dayMatch && timeMatch) {
                courses.push({
                    code: item.replace(/\s/g, ''),
                    subject: subject.substring(0, 50),
                    section: section,
                    day: dayMatch[1],
                    startTime: timeMatch[1],
                    endTime: timeMatch[2],
                    room: room,
                    faculty: faculty.substring(0, 60),
                    rawSchedule: schedule
                });
            }
            
            i = scheduleIndex + 2;
        } else {
            i++;
        }
    }
    
    console.log('Found courses:', courses);
    return courses;
}

function renderTimetableGrid() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // 1-HOUR TIME SLOTS from 12:00 AM to 11:00 PM
    const times = [];
    for (let hour = 0; hour <= 23; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        times.push(`${displayHour}:00 ${period}`);
    }
    
    // Create grid
    const grid = {};
    for (const day of days) {
        grid[day] = {};
        for (let i = 0; i < times.length; i++) {
            grid[day][i] = null;
        }
    }
    
    // Place courses into the grid
    for (const course of currentCourses) {
        if (!course.startTime || !course.day) continue;
        
        const courseDays = getDaysArray(course.day);
        
        // Get start and end times as floats (e.g., 9.5 for 9:30 AM)
        const startFloat = timeToFloat(course.startTime);
        const endFloat = timeToFloat(course.endTime);
        
        // Calculate which hour slot the course starts in (floor)
        const startHour = Math.floor(startFloat);
        const startSlotIndex = startHour;
        
        // Calculate total duration in hours
        const durationHours = endFloat - startFloat;
        
        // Calculate how many hour slots this spans (ceiling)
        const endHour = Math.ceil(endFloat);
        const rowspan = Math.max(1, endHour - startHour);
        
        if (startSlotIndex < 0 || startSlotIndex >= times.length) continue;
        
        // Calculate visual offset within the starting cell (0-70px)
        const startMinutesPastHour = (startFloat - startHour) * 60;
        const topOffset = (startMinutesPastHour / 60) * 70;
        
        // Calculate height for the course block
        const heightPx = Math.max(30, durationHours * 70);
        
        for (const day of courseDays) {
            if (!grid[day][startSlotIndex]) {
                grid[day][startSlotIndex] = {
                    course: course,
                    duration: rowspan,
                    startFloat: startFloat,
                    endFloat: endFloat,
                    topOffset: topOffset,
                    heightPx: heightPx,
                    startIdx: startSlotIndex,
                    endIdx: startSlotIndex + rowspan
                };
            }
        }
    }
    
    // Build the HTML table
    let html = '<div class="timetable-wrapper">';
    html += '<table class="timetable">';
    html += '<thead><tr><th class="time-col">Time</th>';
    for (const day of days) {
        html += `<th>${day}</th>`;
    }
    html += '</thead><tbody>';
    
    for (let slotIdx = 0; slotIdx < times.length; slotIdx++) {
        const hour = slotIdx;
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const period = hour >= 12 ? 'PM' : 'AM';
        const timeLabel = `${displayHour}:00 ${period}`;
        
        html += `<tr class="time-row" data-slot="${slotIdx}" style="height: 70px;">`;
        html += `<td class="time-slot"><strong>${timeLabel}</strong></td>`;
        
        for (const day of days) {
            const cell = grid[day][slotIdx];
            
            // Check if this cell is part of a spanned course (hidden)
            let isSpanned = false;
            for (let prevSlot = 0; prevSlot < slotIdx; prevSlot++) {
                const prevCell = grid[day][prevSlot];
                if (prevCell && prevCell.duration > 0) {
                    if (slotIdx > prevCell.startIdx && slotIdx < prevCell.startIdx + prevCell.duration) {
                        isSpanned = true;
                        break;
                    }
                }
            }
            
            if (isSpanned) {
                html += `<td class="spanned-cell" style="display: none;"></td>`;
            } else if (cell && cell.course) {
                const rowspan = cell.duration;
                // Create a container for absolute positioning
                html += `<td class="course-cell-wrapper" rowspan="${rowspan}" style="position: relative; vertical-align: top;">`;
                html += `
                    <div class="course-cell" onclick="editCourse('${escapeHtml(cell.course.code)}')" 
                         style="position: absolute; top: ${cell.topOffset}px; left: 4px; right: 4px; height: ${cell.heightPx}px; min-height: 30px;">
                        <div class="course-code">${escapeHtml(cell.course.code)}</div>
                        <div class="course-subject">${escapeHtml((cell.course.subject || '').substring(0, 35))}</div>
                        <div class="course-time">${escapeHtml(cell.course.startTime)} - ${escapeHtml(cell.course.endTime)}</div>
                        <div class="course-room">🏠 ${escapeHtml(cell.course.room || 'TBA')}</div>
                    </div>
                `;
                html += `</td>`;
            } else {
                html += `<td class="empty-cell" style="height: 70px;">`;
                html += `</td>`;
            }
        }
        html += `</tr>`;
    }
    
    html += `</tbody>`;
    html += `</table>`; 
    html += `</div>`;
    
    document.getElementById('timetableGrid').innerHTML = html;
}

// Helper: Convert time string to float (e.g., "9:30 AM" -> 9.5)
function timeToFloat(timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    
    return hours + (minutes / 60);
}

function getDaysArray(dayCode) {
    const map = {
        'M': ['Monday'],
        'T': ['Tuesday'],
        'W': ['Wednesday'],
        'Th': ['Thursday'],
        'F': ['Friday'],
        'S': ['Saturday'],
        'TF': ['Tuesday', 'Thursday'],
        'TTh': ['Tuesday', 'Thursday'],
        'MTh': ['Monday', 'Thursday'],
        'MW': ['Monday', 'Wednesday'],
        'MWF': ['Monday', 'Wednesday', 'Friday']
    };
    return map[dayCode] || [dayCode];
}

function editCourse(courseCode) {
    const course = currentCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    currentEditingCourse = course;
    
    // Fill modal with current values
    document.getElementById('editCode').value = course.code;
    document.getElementById('editSubject').value = course.subject || '';
    document.getElementById('editDay').value = course.day;
    document.getElementById('editStartTime').value = course.startTime;
    document.getElementById('editEndTime').value = course.endTime;
    document.getElementById('editRoom').value = course.room || '';
    
    // Show modal
    document.getElementById('editModal').style.display = 'block';
}

// Close modal functions
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingCourse = null;
}

function saveCourseEdits() {
    if (!currentEditingCourse) return;
    
    // Get values from modal
    const newCode = document.getElementById('editCode').value.trim();
    const newSubject = document.getElementById('editSubject').value.trim();
    const newDay = document.getElementById('editDay').value;
    const newStartTime = document.getElementById('editStartTime').value;
    const newEndTime = document.getElementById('editEndTime').value;
    const newRoom = document.getElementById('editRoom').value.trim();
    
    // Update course
    currentEditingCourse.code = newCode;
    currentEditingCourse.subject = newSubject;
    currentEditingCourse.day = newDay;
    currentEditingCourse.startTime = newStartTime;
    currentEditingCourse.endTime = newEndTime;
    currentEditingCourse.room = newRoom;
    
    // Re-render timetable
    renderTimetableGrid();
    showStatus('✅ Schedule updated successfully!', 'success');
    
    // Close modal
    closeModal();
}

// Add event listeners for modal
document.addEventListener('DOMContentLoaded', () => {
    // Modal close handlers
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (saveBtn) saveBtn.onclick = saveCourseEdits;
    
    // Click outside to close
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
});

function resetToOriginal() {
    if (originalCourses.length) {
        currentCourses = JSON.parse(JSON.stringify(originalCourses));
        renderTimetableGrid();
        showStatus('✅ Reset to original schedule.', 'success');
    }
}

function showStudentInfo() {
    const infoDiv = document.getElementById('studentInfo');
    if (currentStudent.name) {
        infoDiv.innerHTML = `<strong>${escapeHtml(currentStudent.name)}</strong> | ${escapeHtml(currentStudent.program || '')}`;
    }
}

function exportAsHTML() {
    const htmlContent = `<!DOCTYPE html>
    <html>
    <head>
        <title>My Class Schedule</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1a472a; }
            .timetable { width: 100%; border-collapse: collapse; }
            .timetable th, .timetable td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
            .timetable th { background: #1a472a; color: white; }
            .time-col, .time-slot { background: #f5f5f5; font-weight: bold; width: 80px; }
            .course-cell { background: #e8f5e9; padding: 8px; border-radius: 6px; margin: 2px; }
            .course-code { font-weight: bold; color: #1a472a; }
            .footer { margin-top: 20px; font-size: 0.8em; color: #999; }
        </style>
    </head>
    <body>
        <h1>📖 My Class Schedule</h1>
        <p><strong>${escapeHtml(currentStudent.name || 'Student')}</strong></p>
        ${document.getElementById('timetableGrid').innerHTML}
        <p class="footer">Generated from USTP COR on ${new Date().toLocaleString()}</p>
    </body>
    </html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my_timetable.html';
    link.click();
    URL.revokeObjectURL(link.href);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 4000);
}

function clearStatus() {
    document.getElementById('status').innerHTML = '';
}

window.editCourse = editCourse;