document.addEventListener('DOMContentLoaded', () => {

    // --- DEFAULT STATE TEMPLATE ---
    const defaultState = {
        globalBaseXp: 0,
        globalLevel: 1,
        calendarData: {},
        completedDailies: [],
        quests: [
            { id: 1, title: "Walk around town looking for specific architecture", diff: 3 }
        ],
        habits: [
            {
                id: "foot", name: "FOOTBALL", level: 1, xp: 20, multiplier: 5,
                dailies: ["90-Min Cardio & Sprint Drills"],
                milestones: ["Analyze Professional Match Tactics"]
            },
            {
                id: "work", name: "WORK (TNM HVAC)", level: 2, xp: 80, multiplier: 3,
                dailies: ["Clean & Organize Workshop"],
                milestones: ["Deploy TNM Website UI"]
            },
            {
                id: "relig", name: "RELIGIOUS STUDIES", level: 1, xp: 50, multiplier: 5,
                dailies: ["Read Daily Prescribed Texts"],
                milestones: ["Complete Major Chapter Translation"]
            },
            {
                id: "acad", name: "ACADEMIC STUDIES", level: 1, xp: 90, multiplier: 1,
                dailies: ["Revise 10th Grade Subjects"],
                milestones: ["Pass Core Science Mock Exam"]
            },
            {
                id: "soc", name: "SOCIAL ACTIVITIES", level: 1, xp: 10, multiplier: 3,
                dailies: ["Check-in with Core Group"],
                milestones: ["Coordinate Scouting Hike Layout"]
            },
            {
                id: "code", name: "CODING", level: 1, xp: 40, multiplier: 5,
                dailies: ["Solve 1 JS/HTML Logic Problem"],
                milestones: ["Build 2D RPG Collision Engine"]
            }
        ]
    };

    let state = {};
    let isEditMode = false;
    let selectedDay = 1;

    // --- DOM ELEMENTS ---
    const dom = {
        lvl: document.getElementById('char-level'),
        xpCur: document.getElementById('current-xp'),
        charSync: document.getElementById('footprint-level-sync'),
        bar: document.getElementById('xp-bar-fill'),
        questList: document.getElementById('global-quest-list'),
        habitContainer: document.getElementById('habits-container'),
        calGrid: document.getElementById('calendar-grid'),
        calNotes: document.getElementById('calendar-notes'),
        dayLabel: document.getElementById('selected-day-label'),
        editBtn: document.getElementById('master-edit-btn')
    };

    // --- SAVE / LOAD ENGINE ---
    function saveState() {
        localStorage.setItem('codex_save_v1', JSON.stringify(state));
    }

    function loadState() {
        const saved = localStorage.getItem('codex_save_v1');
        if (saved) {
            state = JSON.parse(saved);
            if (!state.calendarData) state.calendarData = {};
            if (!state.completedDailies) state.completedDailies = [];
            if (!state.quests) state.quests = defaultState.quests;
        } else {
            state = JSON.parse(JSON.stringify(defaultState));
        }
    }

    // --- CORE LOGIC: THE BALANCED AVERAGE ---
    function updateSystem() {
        let totalHabitLevel = 0;
        state.habits.forEach(h => totalHabitLevel += h.level);
        let averageHabitLvl = Math.floor(totalHabitLevel / state.habits.length);

        let bonusLevelFromQuests = Math.floor(state.globalBaseXp / 100);
        state.globalLevel = bonusLevelFromQuests + averageHabitLvl;

        let remainingXp = state.globalBaseXp % 100;

        dom.lvl.innerText = String(state.globalLevel).padStart(2, '0');
        dom.charSync.innerText = String(state.globalLevel).padStart(2, '0');
        dom.xpCur.innerText = remainingXp;
        dom.bar.style.width = `${remainingXp}%`;

        renderQuests();
        renderHabits();
        saveState();
    }

    // --- FUN QUESTS (GLOBAL) ---
    function renderQuests() {
        dom.questList.innerHTML = '';
        state.quests.forEach((q, index) => {
            const div = document.createElement('div');
            div.className = 'quest-card';
            const stars = "★".repeat(q.diff) + "☆".repeat(5 - q.diff);
            const xpReward = q.diff * 25;

            div.innerHTML = `
                <div>
                    <div class="quest-meta">${stars} | +${xpReward} Base XP</div>
                    <div class="quest-title">${q.title}</div>
                </div>
                <div class="quest-actions">
                    <button class="action-btn check" onclick="app.completeQuest(${index}, ${xpReward})">✓</button>
                    <button class="action-btn cross" onclick="app.deleteQuest(${index})">✕</button>
                </div>
            `;
            dom.questList.appendChild(div);
        });
    }

    document.getElementById('add-global-quest-btn').addEventListener('click', () => {
        let title = prompt("Quest Objective:", "New exploration task");
        if (!title) return;
        let diff = parseInt(prompt("Difficulty (1-5):", "3"));
        state.quests.push({ title: title, diff: Math.min(Math.max(diff, 1), 5) });
        updateSystem();
    });

    window.app = {
        completeQuest: (index, reward) => {
            state.globalBaseXp += reward;
            state.quests.splice(index, 1);
            updateSystem();
        },
        deleteQuest: (index) => {
            state.quests.splice(index, 1);
            updateSystem();
        },
        daily: (habitIdx, taskIdx, isSuccess) => {
            let h = state.habits[habitIdx];
            if (isSuccess) {
                h.xp += (5 * h.multiplier);
                if (h.multiplier === 1) h.multiplier = 3;
                else if (h.multiplier === 3) h.multiplier = 5;
            } else {
                h.xp = Math.max(0, h.xp - 10);
                if (h.multiplier === 5) h.multiplier = 3;
                else if (h.multiplier === 3) h.multiplier = 1;
            }
            state.completedDailies.push(`${habitIdx}-${taskIdx}`);
            checkHabitLevelUp(h);
        },
        mil: (habitIdx, taskIdx, isSuccess) => {
            if (isSuccess) {
                let h = state.habits[habitIdx];
                h.xp += 100;
                h.milestones.splice(taskIdx, 1);
                checkHabitLevelUp(h);
            }
        },
        // --- NEW ADD FUNCTIONS ---
        addDaily: (habitIdx) => {
            let newTask = prompt("Enter new Daily Task:");
            if (newTask && newTask.trim() !== "") {
                state.habits[habitIdx].dailies.push(newTask.trim());
                updateSystem();
            }
        },
        addMilestone: (habitIdx) => {
            let newTask = prompt("Enter new Milestone:");
            if (newTask && newTask.trim() !== "") {
                state.habits[habitIdx].milestones.push(newTask.trim());
                updateSystem();
            }
        }
    };

    function checkHabitLevelUp(habit) {
        while (habit.xp >= 100) {
            habit.xp -= 100;
            habit.level += 1;
            state.globalBaseXp += 50;
        }
        updateSystem();
    }

    // --- HABITS ENGINE (NOW FULLY EDITABLE) ---
    function renderHabits() {
        dom.habitContainer.innerHTML = '';
        state.habits.forEach((h, hIndex) => {
            let multColor = h.multiplier === 5 ? 'var(--green)' : h.multiplier === 3 ? 'var(--gold)' : 'var(--red)';
            let box = document.createElement('div');
            box.className = 'habit-box';

            let dailiesHTML = h.dailies.map((d, dIndex) => {
                let isDone = state.completedDailies.includes(`${hIndex}-${dIndex}`);
                return `
                    <div class="h-item ${isDone ? 'completed' : ''}">
                        <span class="editable edit-habit-daily" data-hidx="${hIndex}" data-idx="${dIndex}" contenteditable="${isEditMode}">${d}</span>
                        <div class="h-actions">
                            <button class="h-btn" onclick="app.daily(${hIndex}, ${dIndex}, true)">✓</button>
                            <button class="h-btn" onclick="app.daily(${hIndex}, ${dIndex}, false)">✕</button>
                        </div>
                    </div>
                `;
            }).join('');

            let milestonesHTML = h.milestones.map((m, mIndex) => `
                <div class="h-item">
                    <span class="editable edit-habit-milestone" data-hidx="${hIndex}" data-idx="${mIndex}" contenteditable="${isEditMode}">${m}</span>
                    <div class="h-actions">
                        <button class="h-btn" onclick="app.mil(${hIndex}, ${mIndex}, true)">✓</button>
                    </div>
                </div>
            `).join('');

            box.innerHTML = `
                <div class="habit-header">
                    <span class="editable edit-habit-name" data-hidx="${hIndex}" contenteditable="${isEditMode}">${h.name}</span>
                    <span>LVL ${h.level}</span>
                </div>
                <div class="streak-box">STREAK MULTIPLIER: <span style="color:${multColor}">${h.multiplier}x</span></div>
                <div class="habit-xp-bar"><div class="habit-xp-fill" style="width: ${h.xp}%"></div></div>
                
                <div class="habit-section-title" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>DAILIES</span>
                    <button class="sys-btn" style="padding:2px 6px; font-size:0.6rem;" onclick="app.addDaily(${hIndex})">+ ADD</button>
                </div>
                ${dailiesHTML}
                
                <div class="habit-section-title" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span>MILESTONES</span>
                    <button class="sys-btn" style="padding:2px 6px; font-size:0.6rem;" onclick="app.addMilestone(${hIndex})">+ ADD</button>
                </div>
                ${milestonesHTML}
            `;
            dom.habitContainer.appendChild(box);
        });
    }

    // SILENT AUTO-SAVE FOR EDITING HABITS
    dom.habitContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('edit-habit-name')) {
            state.habits[e.target.dataset.hidx].name = e.target.innerText;
        } else if (e.target.classList.contains('edit-habit-daily')) {
            state.habits[e.target.dataset.hidx].dailies[e.target.dataset.idx] = e.target.innerText;
        } else if (e.target.classList.contains('edit-habit-milestone')) {
            state.habits[e.target.dataset.hidx].milestones[e.target.dataset.idx] = e.target.innerText;
        }
        saveState(); // Saves whatever you type instantly without refreshing
    });

    document.getElementById('reset-dailies-btn').addEventListener('click', () => {
        state.completedDailies = [];
        updateSystem();
    });

    // --- CALENDAR LEDGER ---
    function renderCalendar() {
        dom.calGrid.innerHTML = '';
        for (let i = 1; i <= 30; i++) {
            let day = document.createElement('div');
            day.className = 'cal-day';
            if (i === selectedDay) day.classList.add('active');

            let dotIndicator = state.calendarData[i] ? `<div class="dot" style="background:var(--gold)"></div>` : '';

            day.innerHTML = `<span class="day-num">${i}</span><div class="dot-matrix">${dotIndicator}</div>`;

            day.addEventListener('click', () => {
                selectedDay = i;
                renderCalendar();
                loadCalendarDay(i);
            });
            dom.calGrid.appendChild(day);
        }
    }

    function loadCalendarDay(dayNum) {
        dom.dayLabel.innerText = dayNum;
        dom.calNotes.value = state.calendarData[dayNum] || '';
    }

    document.getElementById('save-note-btn').addEventListener('click', () => {
        const noteText = dom.calNotes.value.trim();
        if (noteText === '') delete state.calendarData[selectedDay];
        else state.calendarData[selectedDay] = noteText;

        saveState();
        renderCalendar();

        let btn = document.getElementById('save-note-btn');
        btn.innerText = "SAVED!";
        setTimeout(() => btn.innerText = "SAVE SCHEDULE", 1000);
    });

    // --- UI CONTROLS ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).classList.add('active');
        });
    });

    // EDIT MODE TOGGLE
    dom.editBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        document.body.classList.toggle('edit-mode', isEditMode);
        dom.editBtn.classList.toggle('active', isEditMode);
        document.querySelectorAll('.editable').forEach(el => el.setAttribute('contenteditable', isEditMode));
    });

    document.getElementById('hard-reset-btn').addEventListener('click', () => {
        if (confirm("WARNING: This will wipe all your levels, streaks, and calendar notes. Are you sure?")) {
            localStorage.removeItem('codex_save_v1');
            location.reload();
        }
    });

    // --- INIT ---
    loadState();
    loadCalendarDay(selectedDay);
    renderCalendar();
    updateSystem();
});