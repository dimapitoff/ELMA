// ELMA365 Widget Scenario
// Инициализация переменных сценария
declare const Context: any;
declare const System: any;
declare const Namespace: any;
declare const Datetime: any;
declare const Server: any;
declare const console: any;

let processesArray: ProcessInfo[] = [];
let currentPage = 1;
let pageSize = 20;
let templateIdGlobal = '';
let isLoading = false;

// Экспорт функций в глобальный контекст для HTML
(window as any).loadNextPage = loadNextPage;
(window as any).loadPreviousPage = loadPreviousPage;

// Инициализация сценария - вызывается автоматически
async function onInit(): Promise<void> {
    try {
        // Получаем токен от процесса
        await Server.rpc.getToken();
        
        // Получаем первый процесс из namespace для получения templateId
        let process = await Namespace.processes.sending_message_kedo_status._searchInstances().first();
        let templateId = process ? process.data.__templateId : '';
        templateIdGlobal = templateId;
        
        if (!templateId) {
            console.error('Template ID не найден');
            return;
        }
        
        // Загружаем первую страницу данных
        await loadDataForPage(templateId);
    } catch (error) {
        console.error('Ошибка при инициализации сценария:', error);
    }
}

// Загрузка данных с API ELMA365 для конкретной страницы
async function loadDataForPage(templateId: string): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    
    try {
        processesArray = [];
        
        let body = {
            "active": true,
            "size": pageSize,
            "sortExpressions": [
                {
                    "ascending": false,
                    "field": "__createdAt"
                }
            ]
        };
        
        let skipCount = (currentPage - 1) * pageSize;
        body['skip'] = skipCount;
        
        // Используем fetch API для получения данных из API ELMA365
        let res = await fetch(`${System.company.url}/pub/v1/bpm/instance/bytemplateid/${templateId}/list`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Context.data.token}`
            },
            body: JSON.stringify(body)
        });
        
        if (res.ok) {
            let result = await res.json();
            let processes = result.result.result || [];
            
            // Преобразуем данные процессов в формат для таблицы
            for (let process of processes) {
                let obj: ProcessInfo = {};
                obj.name = process.__name;
                obj.status_code = process.status_code;
                
                // Определяем статус процесса
                if (obj.status_code == '200') {
                    obj.state = 'done';
                    obj.color = 'green';
                } else {
                    obj.state = 'error';
                    obj.color = 'red';
                }
                
                obj.is_error = process.is_error;
                obj.topic = process.message_key;
                obj.value = process.value;
                obj.link = System.company.url + `/(p:history/${process.__id})`;
                obj.errorText = process.status_message;
                
                // Форматируем дату
                let date = new Datetime(process.__createdAt as string);
                obj.date = date.format("DD.MM.YYYY HH:mm:ss");
                
                processesArray.push(obj);
            }
            
            // Обновляем данные в контексте для шаблона
            Context.data.processesArray = processesArray;
            updatePaginationUI();
        } else {
            console.error('Ошибка при получении данных:', res.status);
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
    } finally {
        isLoading = false;
    }
}

// Загрузка конкретной страницы
async function loadProcessesPage(page: number): Promise<void> {
    currentPage = page;
    if (templateIdGlobal) {
        await loadDataForPage(templateIdGlobal);
    }
}

// Загрузка следующей страницы
async function loadNextPage(): Promise<void> {
    if (isLoading) return;
    currentPage++;
    await loadProcessesPage(currentPage);
}

// Загрузка предыдущей страницы
async function loadPreviousPage(): Promise<void> {
    if (isLoading) return;
    if (currentPage > 1) {
        currentPage--;
        await loadProcessesPage(currentPage);
    }
}

// Обновление UI элементов пагинации
function updatePaginationUI(): void {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextPageBtn') as HTMLButtonElement;
    
    if (pageInfo) {
        pageInfo.textContent = `Страница ${currentPage}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1 || isLoading;
    }
    
    if (nextBtn) {
        nextBtn.disabled = !processesArray || processesArray.length < pageSize || isLoading;
    }
}

type ProcessInfo = {
    name?: string | undefined,
    date?: string | undefined,
    state?: string | undefined,
    color?: string | undefined,
    status_code?: string | undefined,
    is_error?: string | undefined,
    topic?: string | undefined,
    value?: string | undefined,
    link?: string | undefined,
    errorText?: string | undefined,
}

// Вызов инициализации сценария при загрузке
onInit();