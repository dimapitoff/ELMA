declare const console: any, document: any, window: any;
let processesArray:ProcessInfo[] = [];
let pageSize = 20;
let templateIdGlobal = '';
let totalProcesses = 0;

window.loadNextPage = loadNextPage;
window.loadPreviousPage = loadPreviousPage;

async function onInit():Promise<void> {
    Context.data.currentFrom = "0";
    Context.data.processesArray = [];
    totalProcesses = 0;
    
    await Server.rpc.getToken();
    let process = await Namespace.processes.sending_message_kedo_status._searchInstances().first();
    let templateId = process ? (process.data.__templateId || '') : '';
    templateIdGlobal = templateId;
    
    await goToPage(1);
    await loadNextPage();
}

async function loadDataForPage(templateId: string, from: number = 0): Promise<void> {
    processesArray = [];
    let body = {
        "active": true,
        "size": pageSize,
        "from": from,
        "sortExpressions": [
            {
                "ascending": false,
                "field": "__createdAt"
            }
        ]
    };
    
    let res = await fetch(`${System.company.url}/pub/v1/bpm/instance/bytemplateid/${templateId}/list`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Context.data.token}`
        },
        body: JSON.stringify(body)
    })
    if (res.ok) {
        let result = await res.json();
        let processes = (result.result && Array.isArray(result.result)) ? result.result : (result.result?.result || []);
        
        let total = result?.result?.total || result?.total || 0;
        if (total > 0) {
            totalProcesses = total;
        }
        
        for (let process of processes) {
            let obj:ProcessInfo = {};
            obj.name = process.__name;
            obj.status_code = process.status_code;
            if (obj.status_code == '200') {
                obj.state = 'done'
            } else {
                obj.state = 'error'
            }
            switch (obj.state) {
                case 'done':
                    obj.color = 'green'
                    break;
                case 'error':
                    obj.color = 'red'
                    break;
            }
            obj.is_error = process.is_error;
            obj.topic = process.message_key;
            obj.value = process.value;
            obj.link = System.company.url + `/(p:history/${process.__id})`;
            obj.errorText = process.status_message;
            let date = new Datetime(process.__createdAt as string);
            obj.date = date.format("DD.MM.YYYY HH:mm:ss");
            processesArray.push(obj);
        }
        Context.data.processesArray = processesArray;
        updateTableUI();
        updatePaginationUI();
    }
}

async function loadProcessesPage(from: number): Promise<void> {
    if (templateIdGlobal) {
        await loadDataForPage(templateIdGlobal, from);
    }
}

async function loadNextPage(): Promise<void> {
    const nextFrom = parseInt(String(Context.data.currentFrom || "0")) + pageSize;
    if (nextFrom < totalProcesses) {
        Context.data.currentFrom = String(nextFrom);
        await loadProcessesPage(nextFrom);
    }
}

async function loadPreviousPage(): Promise<void> {
    const currentFrom = parseInt(String(Context.data.currentFrom || "0"));
    if (currentFrom > 0) {
        const prevFrom = Math.max(0, currentFrom - pageSize);
        Context.data.currentFrom = String(prevFrom);
        await loadProcessesPage(prevFrom);
    }
}

async function getData(templateId: string): Promise<void> {
    Context.data.currentFrom = "0";
    await loadDataForPage(templateId, 0);
}

function updateTableUI(): void {
    const tableBody = document.querySelector('.process-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (processesArray && processesArray.length > 0) {
        processesArray.forEach(process => {
            const row = document.createElement('tr');
            row.className = 'process-table-row';
            row.innerHTML = `
                <td class="process-table-item">${process.date || ''}</td>
                <td class="process-table-item">${process.status_code || ''}</td>
                <td class="process-table-item">${process.topic || ''}</td>
                <td class="process-table-item col-message">
                    <div class="process-table-log">${process.value || ''}</div>
                </td>
                <td class="process-table-item">
                    <a href="${process.link || ''}" target="_blank">
                        ${process.name || ''}
                    </a>
                </td>
                <td class="process-table-item">${process.is_error || ''}</td>
                <td class="process-table-item">${process.errorText || ''}</td>
                <td class="process-table-item">
                    <p class="${process.color || ''}">${process.state || ''}</p>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="8" class="process-table-empty">Список пуст</td>';
        tableBody.appendChild(emptyRow);
    }
}

function updatePaginationUI(): void {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pagesContainer = document.getElementById('pagesContainer');
    
    const currentFrom = parseInt(String(Context.data.currentFrom || "0"));
    const currentPage = Math.floor(currentFrom / pageSize) + 1;
    const totalPages = totalProcesses > 0 ? Math.ceil(totalProcesses / pageSize) : 0;
    
    if (pageInfo) {
        pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentFrom === 0;
    }
    
    if (nextBtn) {
        const nextFrom = currentFrom + pageSize;
        nextBtn.disabled = nextFrom >= totalProcesses;
    }
    
    if (pagesContainer) {
        renderPageButtons(currentPage, totalPages);
    }
}

function renderPageButtons(currentPage: number, totalPages: number): void {
    const pagesContainer = document.getElementById('pagesContainer');
    if (!pagesContainer) return;
    
    pagesContainer.innerHTML = '';
    
    if (totalPages === 0) return;
    
    const pageRange = 10;
    let startPage = Math.max(1, currentPage - Math.floor(pageRange / 2));
    let endPage = Math.min(totalPages, startPage + pageRange - 1);
    
    if (endPage - startPage + 1 < pageRange) {
        startPage = Math.max(1, endPage - pageRange + 1);
    }
    
    if (startPage > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.className = 'page-number-btn';
        firstPageBtn.textContent = '1';
        firstPageBtn.addEventListener('click', () => goToPage(1));
        pagesContainer.appendChild(firstPageBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pagesContainer.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-number-btn';
        if (i === currentPage) {
            btn.className += ' active';
        }
        btn.textContent = i.toString();
        btn.addEventListener('click', () => goToPage(i));
        pagesContainer.appendChild(btn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pagesContainer.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'page-number-btn';
        lastPageBtn.textContent = totalPages.toString();
        lastPageBtn.addEventListener('click', () => goToPage(totalPages));
        pagesContainer.appendChild(lastPageBtn);
    }
}

async function goToPage(pageNumber: number): Promise<void> {
    const from = (pageNumber - 1) * pageSize;
    Context.data.currentFrom = String(from);
    await loadProcessesPage(from);
}

type ProcessInfo = {
    name?:string | undefined,
    date?:string | undefined,
    state?:string | undefined,
    color?:string | undefined,
    status_code?:string | undefined,
    is_error?:string | undefined,
    topic?:string | undefined,
    value?:string | undefined,
    link?:string | undefined,
    errorText?:string | undefined,
}