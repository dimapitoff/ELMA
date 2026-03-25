declare const console: any, document: any, window: any, $: any, VanillaCalendar: any, structuredClone: any;

const prevArrowPaginator = `<svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.176567 5.60157L5.69844 0.164075C5.91875 -0.0562378 6.275 -0.0562378 6.49532 0.164075L6.82813 0.496887C7.04844 0.7172 7.04844 1.07345 6.82813 1.29376L2.03282 6.00001L6.82344 10.7063C7.04375 10.9266 7.04375 11.2828 6.82344 11.5031L6.49063 11.8359C6.27032 12.0563 5.91407 12.0563 5.69375 11.8359L0.17188 6.39845C-0.0437453 6.17814 -0.0437453 5.82189 0.176567 5.60157Z" fill="#1E6599"/>
</svg>
`;

const nextArrowPaginator = `<svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.82363 6.39845L1.30176 11.8359C1.08145 12.0563 0.725195 12.0563 0.504883 11.8359L0.17207 11.5031C-0.0482422 11.2828 -0.0482422 10.9266 0.17207 10.7063L4.96738 6.00001L0.176758 1.29376C-0.0435547 1.07345 -0.0435547 0.7172 0.176758 0.496887L0.50957 0.164075C0.729883 -0.0562378 1.08613 -0.0562378 1.30645 0.164075L6.82832 5.60157C7.04394 5.82189 7.04394 6.17814 6.82363 6.39845Z" fill="#1E6599"/>
</svg>
`;

enum TaskType {
    ALL = "all",
    ACTIVE = "active",
    OUTGOING = "outgoing"
};

enum TaskButtonType {
    MAIN = "main",
    SUB = "sub"
};

enum LoaderType {
    TASKS_CONTAINER = "tasks_container",
    TASKS_TABLE = "tasks_table"
};

enum FilterType {
    DUE_DATE = "due_date",
    CREATED_AT = "created_at",
    AUTHOR = "author",
    NAME = "name"
};

interface AjaxSettings {
    type: string;
    cache: boolean;
    data: Data;
    contentType: string;
    dataType: string;
    async: boolean;
    url: string;
    success: Function
};

interface Data {
    size: number;
    from: number;
};

interface TaskObj {
    __id: string;
    path: string;
    branch: string;
    performers: string[];
    originalPerformers: string[];
    companies: null;
    reassignes: null;
    __name: string;
    __target: string;
    __targetData: null;
    __item: null;
    template: string;
    state: string;
    dueDate: string | null;
    timerId: string;
    __createdAt: string;
    __createdBy: string;
    __updatedAt: string;
    __updatedBy: string;
    __deletedAt: null;
    __percent: number;
    planStart: null;
    planEnd: null;
    openRef: boolean;
    allowReassign: boolean;
    __context: any[];
    description: string;
    priority: number;
    place: string;
    externalParticipants: null;
    url: string;
    __logged: boolean;
    detachedInfo: null;
    templateNsAndCode: string;
}

type taskData = {
    id: string,
    created_by_id: string,
    name: string,
    author: string,
    created_at: string,
    created_at_obj: TDatetime,
    due_date: string,
    due_date_obj: TDatetime | undefined,
    status: string,
    state: string,
    process_template: string,
};

type tasksFilters = {
    name: string | undefined,
    due_date: string | undefined,
    created_at: string | undefined,
    author: string | undefined
};

type userMeta = {
    id: string,
    name: string
};

type staffMeta = {
    id: string,
    name: string,
    user_id: string
};

class DomManager {
    tasksLoader: any;
    taskNodeTemplate: any;
    tasksTable: any;
    tasksPaginator: any;
    tasksFilter: any;
    // tasksCounter: any;
    emptyTableTemplate: any;

    handleLoader(loaderType: LoaderType) {
        document.querySelector(`[data-loader=${loaderType}]`).classList.toggle("hidden");
    };

    handleEmptyTable() {
        

        if (systemDataManager.tasksCount === 0) {
            this.tasksTable.classList.add("hidden");
            this.tasksPaginator.classList.add("hidden");
            this.tasksFilter.classList.add("hidden");
            this.emptyTableTemplate.classList.remove("hidden");
        } else {
           
            this.tasksTable.classList.remove("hidden");
            this.tasksPaginator.classList.remove("hidden");
            this.tasksFilter.classList.remove("hidden");
            this.emptyTableTemplate.classList.add("hidden");
        };
    };

    renderStaff() {
        const authorsContainer = document.querySelector(".tasks-page_main-content_title_search-extend_input-author-values");
        systemDataManager.allStaff.forEach(staff => {
            const staffUser = systemDataManager.allUsers.find(user => user.id === staff.user_id);

            if (!staffUser) {
                return;
            };

            const newStaffRow = document.createElement("div");
            newStaffRow.className = "search-item";
            newStaffRow.classList.add("input-author-values_item");
            newStaffRow.textContent = staff.name;
            newStaffRow.dataset["user_id"] = staffUser.id;
            newStaffRow.addEventListener("click", () => {
                handleAuthorChoice(newStaffRow);
            })
            authorsContainer.append(newStaffRow);
        });
    };

    async handleTaskClose(taskId: string, handlerName: string) {
        const task = await System.processes._searchTasks().where(f => f.__id.eq(taskId)).first();
        if (task && task.data.state == ProcessTaskState.closed) {
            getData(window.localStorage.getItem("task_type"));
            window.clearInterval(handlerName);
        };
    };

    getItemRow(item: taskData) {
        item = <taskData>item;
        const taskElementContent = this.taskNodeTemplate.content.cloneNode(true);
        
        // const taskItemName = taskElementContent.querySelector(".tasks-name");
        const taskItemTitle = taskElementContent.querySelector(".tasks-title");

        const taskItemName = taskItemTitle.querySelector(".tasks-name");
        const taskItemTemplate = taskItemTitle.querySelector(".tasks-name__template");

        //const taskItemStatus = taskElementContent.querySelector(".tasks-page_main-content_table-item-section_status");
        const taskElementItem = taskElementContent.querySelector(".tasks-page_main-content_table-item") || taskElementContent.querySelector(".tasks-page_main-content_mobile_container-item");

        taskItemName.textContent = item.name;
        taskItemTemplate.textContent = item.process_template;
        //taskItemStatus.textContent = item.status;
        taskElementItem.href = `${systemDataManager.baseUrl}(p:task/${item.id})`;
        taskElementItem.dataset["task_id"] = item.id;

        const taskItemAuthor = taskElementContent.querySelector(".task-author");
        const taskItemCreatedAt = taskElementContent.querySelector(".task-created");
        const taskItemDue = taskElementContent.querySelector(".task-due");

        taskItemAuthor.textContent = item.author;
        taskItemDue.textContent = item.due_date;
        taskItemCreatedAt.textContent = item.created_at;

        // Для мобилки
        const taskItemMobile = taskElementContent.querySelector(".task-mobile-data");
        const taskItemMobileAuthor = taskItemMobile.querySelector(".task-author");
        const taskItemMobileDue = taskItemMobile.querySelector(".task-due");

        taskItemMobileAuthor.textContent = `Автор: ${item.author}`;
        taskItemMobileDue.textContent = item.due_date_obj ? `до ${item.due_date_obj.format("DD.MM.YY, HH:mm")}` : "";

        return taskElementItem;
    };

    getPaginatorTemplate(data: taskData[]) {
        const mockContainer = document.createElement("div");

        data.forEach(item => {
            const newRow = this.getItemRow(item);
            mockContainer.append(newRow);
        });
        return mockContainer.innerHTML;
    };

    // renderCounter(count: number) {
    //     if (count === 0) {
    //         return;
    //     } 

    //     const textCounter = count > 99 ? "99+" : count.toString();

    //     this.tasksCounter.textContent = textCounter;
    // }

    renderPaginator(taskType: TaskType) {
        const getPaginatorTemplate = this.getPaginatorTemplate.bind(domManager);
        const handleTaskClose = this.handleTaskClose.bind(domManager);
        const paginatorQuery = getQuery(taskType);
        const adjustDigit = systemDataManager.tasksCount % 10 === 0 ? -1 : 1
        const tasksCount = Math.floor(systemDataManager.tasksCount / 10) * 10 + adjustDigit;
        let showPrevious: boolean, showNext: boolean;
        showPrevious = showNext = tasksCount >= 10;

        $('.tasks-page_main-content_paginator').pagination({
            showPrevious,
            showNext,
            dataSource: paginatorQuery,
            alias: {
                pageNumber: "from",
                pageSize: "size"
            },
            ajaxFunction(settings: AjaxSettings) {
                settings.data.from = settings.data.from === 1 ? 0 : (settings.data.from - 1) * 10;
                
                $.get(settings.url, settings.data, function (data: any) {
                    
                    settings.success(data)
                });
                // fetch(settings.url)
                //     .then(resp => resp.json())
                //     .then(data => {
                //         settings.success(data);
                //     });
            },
            locator: "result",
            totalNumber: tasksCount,
            callback: function (data: TaskObj[], pagination: any) {
                const serializedTasks = data.map(serializeTask);
                const html = getPaginatorTemplate(serializedTasks);
                $('.tasks-page_main-content_table-content').html(html);
                const allTasksRows = document.querySelectorAll(".tasks-page_main-content_table-content .tasks-page_main-content_table-item");
                allTasksRows.forEach((row: any) => {
                    row.addEventListener("click", () => {
                        const handlerName = `task-${row.dataset["task_id"]}-handler`;
                        if (window[handlerName]) {
                            return;
                        };
                        window[handlerName] = true;
                        const taskInterval = window.setInterval(() => {
                            handleTaskClose(row.dataset["task_id"], taskInterval);
                        }, 1000);
                    });
                })
            },
            ulClassName: "content_paginator",
            prevClassName: "paginator-item",
            nextClassName: "paginator-item",
            pageClassName: "paginator-item",
            prevText: prevArrowPaginator,
            nextText: nextArrowPaginator,
            pageRange: 1,
            hideLastOnEllipsisShow: true,
            hideFirstOnEllipsisShow: true,
        });
        domManager.handleEmptyTable();
    }
};

class SystemDataManager {
    allUsers: userMeta[];
    allStaff: staffMeta[];
    tasks: ProcessTaskItem[];
    baseUrl = window.location.href;
    currentUser: CurrentUserItem;
    tasksCount = 0;
};


const dateRegex = /^([120]{1}[0-9]{1}|3[01]{1,2}|0[1-9])\.(1[0-2]|0[1-9])\.\d{4}/;
const monthReference: Record<string, string> = {
    "1": "Января",
    "2": "Февраля",
    "3": "Марта",
    "4": "Апреля",
    "5": "Мая",
    "6": "Июня",
    "7": "Июля",
    "8": "Августа",
    "9": "Сентября",
    "10": "Октября",
    "11": "Ноября",
    "12": "Декабря"
};

const taskTypeReference: { [key: string]: string } = {
    "in_progress": "В процессе",
    "assignment": "На распределении",
    "cancel": "Отменена",
    "closed": "Закрыта"
};

function setDate(event: any) {
    const [year, month, day] = [...event.target.dataset.calendarDay.split("-")];
    const dateString = `${day}.${month}.${year}`;
    const calendarInput = event.target.closest(".task-search-date").querySelector("input");
    const calendarArrow = event.target.closest(".task-search-date").querySelector(".tasks-page_main-content_title_search-extend_input-date-arrow");
    const closestCalendar = event.target.closest(".vanilla-calendar");
    const filterType: FilterType = calendarInput.dataset.filter;

    calendarArrow.style.transform = "";
    calendarInput.value = dateString;
    closestCalendar.classList.toggle("hidden");

    setFilterField(filterType, dateString);
};

const calendarObject = {
    options: {
        actions: {
            clickDay(event: any, self: any) {
                setDate(event)
            }
        },
        settings: {
            lang: "ru-RU"
        }
    },
    setCalendars() {
        const taskCreatedCalendar = new VanillaCalendar(".tasks-page_main-content_title_search-extend_item-value_calendar.created-at-calendar", this.options);
        const taskDueDate = new VanillaCalendar(".tasks-page_main-content_title_search-extend_item-value_calendar.valid-to-calendar", this.options);
        [taskCreatedCalendar, taskDueDate].forEach(calendar => calendar.init());
    }
};

const activeQueryObj = {
    "and": [
        {
            "in": [
                {
                    "field": "state"
                },
                {
                    "list": [
                        "assignment",
                        "in_progress"
                    ]
                }
            ]
        },
        {
            "eq": [
                {
                    "field": "__deletedAt"
                },
                null
            ]
        }
    ]
};

const allQueryObj = {
    "and": [
        {
            "in": [
                {
                    "field": "state"
                },
                {
                    "list": [
                        "assignment",
                        "in_progress",
                        "closed"
                    ]
                }
            ]
        },
        {
            "eq": [
                {
                    "field": "__deletedAt"
                },
                null
            ]
        }
    ]
};

const outgoingQueryObj = {
    "and": [
        {
            "in": [
                {
                    "field": "state"
                },
                {
                    "list": [
                        "assignment",
                        "in_progress",
                        "closed"
                    ]
                }
            ]
        },
        {
            "eq": [
                {
                    "field": "__deletedAt"
                },
                null
            ]
        }
    ]
};

const domManager = new DomManager();
const systemDataManager = new SystemDataManager();
const tasksFilterClosure: ApplicationFilterClosure<ProcessTaskData> = (f, g) => {
    const filters: Filter[] = [f.__deletedAt.eq(null)];
    const tasksFilters: tasksFilters = window.localStorage.tasks_filters ? JSON.parse(window.localStorage.getItem("tasks_filters")) : {};
    const tasksType: TaskType = window.localStorage.getItem("task_type");

    switch (tasksType) {
        case TaskType.ACTIVE:
            filters.push(...[g.or(f.state.like(ProcessTaskState.assignment), f.state.like(ProcessTaskState.inProgress)), f.performers.has(systemDataManager.currentUser)])
            break;
        case TaskType.ALL:
            filters.push(f.performers.has(systemDataManager.currentUser))
            break;
        case TaskType.OUTGOING:
            filters.push(...[g.or(f.state.like(ProcessTaskState.assignment), f.state.like(ProcessTaskState.inProgress)), f.__createdBy.eq(systemDataManager.currentUser)]);
            break;
    };

    if (Object.keys(tasksFilters).length > 0) {
        if (tasksFilters.name) {
            filters.push(f.__name.like(tasksFilters.name))
        };
        if (tasksFilters.due_date) {
            const [day, month, year] = tasksFilters.due_date.split(".").map(Number);
            const dueDate = new TDate(year, month, day).asDatetime(new TTime());
            filters.push(f.dueDate.lte(dueDate));
        };
        if (tasksFilters.created_at) {
            const [day, month, year] = tasksFilters.created_at.split(".").map(Number);
            const createdAt = new TDate(year, month, day).asDatetime(new TTime());
            filters.push(f.__createdAt.gte(createdAt));
        };
        if (tasksFilters.author) {
            const user = systemDataManager.allUsers.find(u => u.id === tasksFilters.author);
            filters.push(f.__createdBy.eq(<TRefItem>{ namespace: "system", code: "users", id: user!.id }));
        };
    };

   

    return g.and(...filters);
};

function getQuery(taskType: TaskType): string {
    let filterObj: {
        "and": {}[]
    };

    switch (taskType) {
        case TaskType.ACTIVE:
            filterObj = structuredClone(activeQueryObj);
            filterObj.and.push({
                "in": [
                    {
                        "const": systemDataManager.currentUser.id
                    },
                    {
                        "field": "performers"
                    }
                ]
            });
            break;
        case TaskType.ALL:
            filterObj = structuredClone(allQueryObj);
            filterObj.and.push({
                "in": [
                    {
                        "const": systemDataManager.currentUser.id
                    },
                    {
                        "field": "performers"
                    }
                ]
            });
            break;

        case TaskType.OUTGOING:
            filterObj = structuredClone(outgoingQueryObj);
            filterObj.and.push({
                "eq": [
                    {
                        "const": systemDataManager.currentUser.id
                    },
                    {
                        "field": "__createdBy"
                    }
                ]
            });
            break;
    };

    const tasksFilters: tasksFilters = window.localStorage.tasks_filters ? JSON.parse(window.localStorage.getItem("tasks_filters")) : {};

    if (Object.keys(tasksFilters).length > 0) {
        if (tasksFilters.author) {
            filterObj.and.push({
                "eq": [
                    {
                        "const": tasksFilters.author
                    },
                    {
                        "field": "__createdBy"
                    }
                ]
            })
        };
        if (tasksFilters.due_date) {
            const [day, month, year] = tasksFilters.due_date.split(".").map(Number);
            const dueDate = new TDate(year, month, day).asDatetime(new TTime()).format();
            filterObj.and.push({
                "and": [
                    {
                        "tf": {
                            "dueDate": {
                                "min": null,
                                "max": dueDate
                            }
                        }
                    }
                ]
            })
        };
        if (tasksFilters.created_at) {
            const [day, month, year] = tasksFilters.created_at.split(".").map(Number);
            const createdAt = new TDate(year, month, day).asDatetime(new TTime()).format();
            filterObj.and.push({
                "and": [
                    {
                        "tf": {
                            "__createdAt": {
                                "min": createdAt,
                                "max": null
                            }
                        }
                    }
                ]
            })
        };
        if (tasksFilters.name) {
            filterObj.and.push({
                "and": [
                    {
                        "tf": {
                            "__name": tasksFilters.name
                        }
                    }
                ]
            });
        };
    };

    return `${System.getBaseUrl()}/api/processor/tasks/items?q=${JSON.stringify(filterObj)}`;
};

function serializeName(userName: string): string {
    const userNameArr = userName.split(" ");
    return userNameArr.length === 3
        ? `${userNameArr[0]} ${userNameArr[1][0]} ${userNameArr[2][0]}`
        : userNameArr.length === 2
            ? `${userNameArr[0]} ${userNameArr[1][0]}`
            : `${userName}`
};

function serializeTask(task: TaskObj): taskData {
    const author = systemDataManager.allUsers.find(user => user.id === task.__createdBy);
    const authorName = author ? serializeName(author.name) : "Система";
    const createdAtObj = new Datetime(task.__createdAt);
    const dueDateObj = task.dueDate ? new Datetime(task.dueDate) : undefined

    const newTaskObj = {
        id: task.__id,
        name: task.__name,
        author: authorName,
        created_at_obj: createdAtObj,
        due_date_obj: dueDateObj,
        created_at: createdAtObj?.format("DD MMMM YYYY г., HH:mm") ?? "не определено",
        due_date: dueDateObj?.format("DD MMMM YYYY г., HH:mm") ?? "не определено",
        // created_at: `
        // ${createdAtObj.day}.${createdAtObj.month.toString().length < 2 ? "0" + createdAtObj.month.toString() : createdAtObj.month.toString()}.${createdAtObj.year}, ${createdAtObj.hours}:${createdAtObj.minutes.toString().length < 2 ? "0" + createdAtObj.minutes.toString() : createdAtObj.minutes.toString()}`,
        // due_date: dueDateObj ? `
        // ${dueDateObj.day}.${dueDateObj.month.toString().length < 2 ? "0" + dueDateObj.month.toString() : dueDateObj.month.toString()}.${dueDateObj.year}, ${dueDateObj.hours}:${dueDateObj.minutes.toString().length < 2 ? "0" + dueDateObj.minutes.toString() : dueDateObj.minutes.toString()}` : "не определено",
        status: task.state ? taskTypeReference[task.state] : "Не определён",
        state: task.state ? task.state.toString() : "",
        created_by_id: author ? author.id : "",
        process_template: task.template ?? "",
    };

    return newTaskObj;
};

function handleAuthorChoice(target: any) {
    const authorInput = target.parentElement.parentElement.querySelector("input");
    const userId = target.dataset["user_id"]
    authorInput.value = target.textContent.trim();
    authorInput.dataset["user_id"] = userId;
    expandAuthorContainer(target);
    setFilterField(FilterType.AUTHOR, userId);
};

function clearFilters() {
    window.localStorage.removeItem("tasks_filters");
    const allInputs = document.querySelectorAll(".tasks-page_main-content_title_search-extend input");
    allInputs.forEach((input: any) => {
        input.value = "";
    });
    getData(window.localStorage.getItem("task_type"));
};

function expandAuthorContainer(target: any, fromSearchButton = false) {
    let authorValuesContainer: any;
    if (fromSearchButton) {
        authorValuesContainer = target.parentElement.querySelector(".search-choice-items");
    } else {
        authorValuesContainer = target.parentElement;
    }
    authorValuesContainer.classList.toggle("expanded");
};

function handleAuthorSearch(target: any) {
    const authorValues = target.parentElement.querySelector(".search-choice-items");
    if (!authorValues.classList.contains("expanded") || !target.value || target.value.length < 1) {
        authorValues.classList.toggle("expanded");
    };
    const authorItems = authorValues.querySelectorAll(".input-author-values_item");

    authorItems.forEach((item: any) => {
        if (!item.textContent.toLowerCase().includes(target.value.toLowerCase()) && !item.classList.contains("hidden")) {
            item.classList.toggle("hidden");
        } else if (item.textContent.toLowerCase().includes(target.value.toLowerCase()) && item.classList.contains("hidden")) {
            item.classList.toggle("hidden")
        };
    });
};

function expandCalendar(target: any) {
    target.style.transform = target.style.transform
        ? ""
        : "rotateZ(180deg)"
    const calendar = target.parentElement.nextElementSibling;
    calendar.classList.toggle("hidden");
};

function checkAndSetDate(target: any) {
    if (!target.value || target.value.length < 1) {
        return;
    };

    if (target.value.match(dateRegex)) {
        const filterType: FilterType = target.dataset.filter;
        setFilterField(filterType, target.value);
    };
};

function setFilterField(filterType: FilterType, filterValue: string) {
    if (filterType === FilterType.NAME) {
        const mainInput = document.querySelector(".tasks-page_main-content_title_search .tasks-page_main-content_title_search-input");
        mainInput.value = filterValue;
    };
    const filterObject = window.localStorage.getItem("tasks_filters") ? JSON.parse(window.localStorage.getItem("tasks_filters")) : {};
    filterObject[filterType] = filterValue;
    window.localStorage.setItem("tasks_filters", JSON.stringify(filterObject));
};

async function expandSearch(target: any) {
    let expandSearchContainer: any;
    let expandModal = document.querySelector(".tasks-page_main-content .dropdown-modal");

    if (Array.from(target.classList).some((cls: any) => cls.includes("common-content_title_search-extend_title-img"))) {
        expandSearchContainer = target.parentElement.parentElement
    } else if (target.classList.contains("tasks-search")) {
        expandSearchContainer = target.closest(".tasks-page_main-content_title_search-extend");
        getData(window.localStorage.getItem("task_type"));
    } else {
        expandSearchContainer = target.nextElementSibling
    };

    expandSearchContainer.classList.toggle("expanded");
    expandModal.classList.toggle("hidden");
};

function handleIssueDropdownModal(target: any) {
    const dropdown = document.querySelector(".tasks-page_main-content_title_search-extend");
    let modal: any;

    if (target.classList.contains("dropdown-modal")) {
        modal = target;
    } else {
        modal = document.querySelector(".dropdown-modal");
    };
    dropdown.classList.toggle("expanded");
    modal.classList.toggle("hidden");
};

function handleTasksType(target: any) {
    let taskType: TaskType = target.dataset['task_type'] || window.localStorage.getItem("task_type");

    const taskButtonType: TaskButtonType = target.dataset['button_type'];
    const buttonClassQuery = taskButtonType === TaskButtonType.MAIN ? ".tasks-page_main-content_title-left .tasks-page_main-content_title_tab" : ".tasks-page_main-content_task-types .tasks-page_main-content_title_tab"
    const taskTypesContainer = document.querySelector(".tasks-page_main-content_task-types");

    const restButtons = document.querySelectorAll(`${buttonClassQuery}:not([data-task_type=${taskType}])`);
    target.classList.add("active");
    restButtons.forEach((button: any) => button.classList.remove("active"));

    taskButtonType === TaskButtonType.MAIN && taskType === TaskType.OUTGOING ? taskTypesContainer.classList.add("hidden") : taskButtonType === TaskButtonType.MAIN ? taskTypesContainer.classList.remove("hidden") : "";

    if (target.dataset["button_type"] === "main" && taskType === TaskType.ACTIVE) {
        taskType = document.querySelector(".tasks-page_main-content_task-types .task-list-type.active").dataset["task_type"];
    };

    window.localStorage.setItem("task_type", taskType);
    getData(taskType);
};

async function handleMainSearch(event: any) {
    if (event.type === "keypress") {
        getData(window.localStorage.getItem("task_type"))
        return;
    };

    setFilterField(FilterType.NAME, event.target.value);
    const nameInput = document.querySelector(".tasks-page_main-content_title_search-extend_input[data-filter=name]");
    nameInput.value = event.target.value;
};

async function onLoad(): Promise<void> {
    domManager.tasksLoader = document.querySelector("[data-loader=tasks_widget]");
    domManager.taskNodeTemplate = document.querySelector(".tasks-page_main-content_table-item_template");
    // domManager.tasksCounter = document.querySelector(".tasks-page_main-content_title_counter");
    domManager.tasksFilter = document.querySelector(".tasks-page_main-content_title-right");
    domManager.tasksTable = document.querySelector(".tasks-page_main-content_table");
    domManager.tasksPaginator = document.querySelector(".tasks-page_main-content_paginator");
    domManager.emptyTableTemplate = document.querySelector(".tasks-page_main-content_table-empty-template");
    const mainInput = document.querySelector(".tasks-page_main-content_title_search .tasks-page_main-content_title_search-input");
    mainInput.addEventListener("input", (e: any) => {
        handleMainSearch(e);
    });
    mainInput.addEventListener("keypress", (e: any) => {
        if ((e.keyCode === 13 || e.keyCode === 76)) {
            handleMainSearch(e);
        };
    });

    if (!window.tasksRefreshInterval && Context.data.refresh_data) {
        window.tasksRefreshInterval = window.setInterval(() => {
            getData(window.localStorage.getItem("task_type"));
        }, 60000)
    };
};

async function onInit(): Promise<void> {
    init()//.then(_ => domManager.handleLoader(LoaderType.TASKS_CONTAINER));
};

async function init(): Promise<void> {
    window.localStorage.setItem("task_type", TaskType.ACTIVE);
    window.localStorage.removeItem("tasks_filters");

    [systemDataManager.currentUser] = await Promise.all([
        System.users.getCurrentUser(),
        Server.rpc.getUsersAndStaff()
    ]);

   
    const serverData: { users: userMeta[], staff: staffMeta[] } = JSON.parse(Context.data.users_and_staff_json!);
    systemDataManager.allStaff = serverData.staff;
    systemDataManager.allUsers = serverData.users;
    

    calendarObject.setCalendars();
    domManager.renderStaff();
    await getData(TaskType.ACTIVE);
};

async function getData(taskType: TaskType): Promise<void> {
    domManager.handleLoader(LoaderType.TASKS_TABLE)
    taskType = taskType || window.localStorage.getItem("task_type");

    const allTasksCount = await System.processes._searchTasks().where(tasksFilterClosure).count();
    systemDataManager.tasksCount = allTasksCount;

    domManager.handleEmptyTable();
    domManager.renderPaginator(taskType);
    // domManager.renderCounter(allTasksCount);
    domManager.handleLoader(LoaderType.TASKS_TABLE);
};

async function refreshTasks(): Promise<void> {
    getData(window.localStorage.getItem("task_type"));
}