// Calendar widget for the Thymer sidebar

class Plugin extends AppPlugin {
  onLoad() {
    this._registerWidget();
    this._reloadHandlerId = this.events.on("reload", () => {
      this._registerWidget();
    });
  }

  onUnload() {
    if (this._reloadHandlerId) {
      this.events.off(this._reloadHandlerId);
      this._reloadHandlerId = null;
    }
    if (this._widget) {
      this._widget.remove();
      this._widget = null;
    }
  }

  _registerWidget() {
    if (this._widget) return;
    this._widget = this.ui.addSidebarWidget((container, { refresh }) => {
      this._refresh = refresh;
      this._renderCalendar(container);
      return () => {};
    });
  }

  async _openJournal(date) {
    const users = this.data.getActiveUsers();
    if (!users.length) return;
    const user = users[0];

    const collections = await this.data.getAllCollections();
    const journal = collections.find(c => c.isJournalPlugin());
    if (!journal) return;

    const panel = this.ui.getActivePanel();
    if (!panel) return;

    const dt = DateTime.dateOnly(date.getFullYear(), date.getMonth(), date.getDate());
    panel.navigateToJournal(user, dt);
  }

  _renderCalendar(container) {
    const today = new Date();
    if (!this._viewDate) {
      this._viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    container.innerHTML = "";

    const style = document.createElement("style");
    style.textContent = `
      .scal-root {
        font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
        padding: 10px 8px 10px;
        user-select: none;
        width: 100%;
        box-sizing: border-box;
      }
      .scal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px; /* was 12px */
        gap: 4px;
      }
      .scal-month-label {
        font-size: clamp(14px, 4cqw, 18px);
        font-weight: 700;
        color: var(--color-text-primary);
        letter-spacing: 0.02em;
        text-align: center;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .scal-nav-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        flex-shrink: 0;
        font-size: clamp(16px, 4cqw, 20px);
        transition: background 0.12s, color 0.12s;
      }
      .scal-nav-btn:hover {
        background: var(--color-background-secondary);
        color: var(--color-text-primary);
      }
      .scal-nav-btn:active {
        background: var(--color-background-tertiary);
      }
      .scal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px 0; /* was 4px */
        width: 100%;
      }
      .scal-dow {
        text-align: center;
        font-size: clamp(11px, 3cqw, 13px);
        font-weight: 700;
        color: var(--color-text-tertiary);
        letter-spacing: 0.05em;
        padding-bottom: 3px; /* was 8px */
        text-transform: uppercase;
        line-height: 1; /* added */
      }
      .scal-day {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(14px, 3.8cqw, 16px);
        color: var(--color-text-primary);
        aspect-ratio: 1;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.1s, color 0.1s;
        line-height: 1; /* tighter */
        width: 100%;
        padding: 0; /* added */
        box-sizing: border-box;
        text-decoration: none;
      }
      .scal-day:hover {
        background: var(--color-background-secondary);
      }
      .scal-day.other-month {
        color: var(--color-text-tertiary);
        opacity: 0.4;
      }
      .scal-day.today {
        background: var(--color-text-primary);
        color: var(--color-background-primary);
        font-weight: 700;
        box-shadow: 0 0 0 2px var(--color-text-primary), 0 0 0 4px var(--color-background-primary), 0 0 0 5px var(--color-text-primary);
      }
      .scal-day.today:hover {
        opacity: 0.85;
      }
    `;
    container.appendChild(style);

    const root = document.createElement("div");
    root.className = "scal-root";
    root.style.containerType = "inline-size";
    container.appendChild(root);

    const vd = this._viewDate;
    const year = vd.getFullYear();
    const month = vd.getMonth();

    const header = document.createElement("div");
    header.className = "scal-header";

    const prevBtn = document.createElement("button");
    prevBtn.className = "scal-nav-btn";
    prevBtn.title = "Previous month";
    prevBtn.textContent = "‹";
    prevBtn.addEventListener("click", () => {
      this._viewDate = new Date(year, month - 1, 1);
      this._renderCalendar(container);
    });

    const monthLabel = document.createElement("span");
    monthLabel.className = "scal-month-label";
    monthLabel.textContent = vd.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const nextBtn = document.createElement("button");
    nextBtn.className = "scal-nav-btn";
    nextBtn.title = "Next month";
    nextBtn.textContent = "›";
    nextBtn.addEventListener("click", () => {
      this._viewDate = new Date(year, month + 1, 1);
      this._renderCalendar(container);
    });

    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);
    root.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "scal-grid";

    for (const d of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
      const cell = document.createElement("div");
      cell.className = "scal-dow";
      cell.textContent = d;
      grid.appendChild(cell);
    }

    const firstDayRaw = new Date(year, month, 1).getDay();
    const firstDay = (firstDayRaw + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayObj = new Date();
    const todayKey = `${todayObj.getFullYear()}-${todayObj.getMonth()}-${todayObj.getDate()}`;

    for (let i = firstDay - 1; i >= 0; i--) {
      grid.appendChild(this._makeCell(daysInPrevMonth - i, month - 1, year, todayKey, true, container));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      grid.appendChild(this._makeCell(d, month, year, todayKey, false, container));
    }

    const trailing = (firstDay + daysInMonth) % 7;
    const trailingCount = trailing === 0 ? 0 : 7 - trailing;
    for (let d = 1; d <= trailingCount; d++) {
      grid.appendChild(this._makeCell(d, month + 1, year, todayKey, true, container));
    }

    root.appendChild(grid);
  }

  _makeCell(day, month, year, todayKey, isOtherMonth, container) {
    const date = new Date(year, month, day);
    const ry = date.getFullYear(), rm = date.getMonth(), rd = date.getDate();
    const key = `${ry}-${rm}-${rd}`;

    const cell = document.createElement("div");
    cell.className = "scal-day";
    if (isOtherMonth) cell.classList.add("other-month");
    if (key === todayKey) cell.classList.add("today");
    cell.textContent = rd;

    cell.addEventListener("click", () => {
      this._viewDate = new Date(ry, rm, 1);
      this._renderCalendar(container);
      this._openJournal(date);
    });

    return cell;
  }
}
