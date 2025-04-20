// Các hàm xử lý phía client để tương tác với API

// Hàm lấy dữ liệu từ API
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        throw error;
    }
}

// Hàm lấy danh sách linh kiện có phân trang
async function getLinhKien(page = 1, limit = 10, sortField = 'id', sortOrder = 'asc', filters = {}) {
    let url = `/api/linhkien?page=${page}&limit=${limit}&sortField=${sortField}&sortOrder=${sortOrder}`;
    
    // Thêm các bộ lọc vào URL
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            url += `&${key}=${encodeURIComponent(filters[key])}`;
        }
    });
    
    return await fetchData(url);
}

// Hàm lấy chi tiết linh kiện theo ID
async function getLinhKienById(id) {
    return await fetchData(`/api/linhkien/${id}`);
}

// Hàm lấy danh sách loại sản phẩm
async function getLoaiSanPham() {
    return await fetchData('/api/loai');
}

// Hàm tạo mới linh kiện
async function createLinhKien(linhKien, imageFile = null) {
    try {
        let url = '/api/linhkien';
        let options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(linhKien)
        };
        
        // Nếu có file ảnh, sử dụng FormData
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            // Thêm các trường dữ liệu vào FormData
            Object.keys(linhKien).forEach(key => {
                formData.append(key, linhKien[key]);
            });
            
            // Cập nhật options cho FormData
            options = {
                method: 'POST',
                body: formData
            };
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi tạo linh kiện:', error);
        throw error;
    }
}

// Hàm tạo nhiều linh kiện từ file JSON
async function createManyLinhKien(linhKienArray) {
    try {
        const response = await fetch('/api/linhkien/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(linhKienArray)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi tạo nhiều linh kiện:', error);
        throw error;
    }
}

// Hàm cập nhật linh kiện
async function updateLinhKien(id, linhKien, imageFile = null) {
    try {
        let url = `/api/linhkien/${id}`;
        let options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(linhKien)
        };
        
        // Nếu có file ảnh, sử dụng FormData
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            // Thêm các trường dữ liệu vào FormData
            Object.keys(linhKien).forEach(key => {
                formData.append(key, linhKien[key]);
            });
            
            // Cập nhật options cho FormData
            options = {
                method: 'PUT',
                body: formData
            };
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi cập nhật linh kiện:', error);
        throw error;
    }
}

// Hàm cập nhật nhiều linh kiện
async function updateManyLinhKien(linhKienArray) {
    try {
        const response = await fetch('/api/linhkien', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(linhKienArray)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi cập nhật nhiều linh kiện:', error);
        throw error;
    }
}

// Hàm xóa linh kiện
async function deleteLinhKien(id) {
    try {
        const response = await fetch(`/api/linhkien/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi xóa linh kiện:', error);
        throw error;
    }
}

// Hàm xóa nhiều linh kiện
async function deleteManyLinhKien(ids) {
    try {
        const response = await fetch('/api/linhkien', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi xóa nhiều linh kiện:', error);
        throw error;
    }
}

// Hàm tìm kiếm với regex
async function searchWithRegex(field, pattern, options = 'i') {
    try {
        const url = `/api/search/regex?field=${field}&pattern=${encodeURIComponent(pattern)}&options=${options}`;
        return await fetchData(url);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm với regex:', error);
        throw error;
    }
}

// Hàm tìm kiếm trong khoảng giá trị
async function searchInRange(field, min, max) {
    try {
        let url = `/api/search/range?field=${field}`;
        
        if (min !== undefined && min !== null) {
            url += `&min=${min}`;
        }
        
        if (max !== undefined && max !== null) {
            url += `&max=${max}`;
        }
        
        return await fetchData(url);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm trong khoảng:', error);
        throw error;
    }
}

// Hàm tìm kiếm với nhiều điều kiện
async function searchWithMultipleConditions(conditions, type = 'and') {
    try {
        const url = `/api/search/multiple?conditions=${encodeURIComponent(JSON.stringify(conditions))}&type=${type}`;
        return await fetchData(url);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm với nhiều điều kiện:', error);
        throw error;
    }
}

// Hàm lấy ID lớn nhất theo loại
async function getMaxIdByType(type) {
    try {
        return await fetchData(`/api/maxid/${type}`);
    } catch (error) {
        console.error('Lỗi khi lấy ID lớn nhất:', error);
        throw error;
    }
}

// Hàm tạo ID tự động theo loại
async function generateNextId(type) {
    try {
        return await fetchData(`/api/nextid/${type}`);
    } catch (error) {
        console.error('Lỗi khi tạo ID tự động:', error);
        throw error;
    }
}

// Hàm hiển thị thông báo
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Tự động ẩn thông báo sau 3 giây
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

// Hàm tạo phân trang
function createPagination(paginationInfo, currentPage, onPageChange) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    const { total, limit, totalPages } = paginationInfo;
    
    // Tạo phần tử hiển thị thông tin tổng số mẫu tin
    const infoSpan = document.createElement('span');
    infoSpan.textContent = `Tổng số: ${total} mẫu tin`;
    infoSpan.className = 'pagination-info';
    paginationContainer.appendChild(infoSpan);
    
    // Tạo nút trang trước
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Trước';
    prevButton.disabled = currentPage <= 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevButton);
    
    // Tạo các nút số trang
    const maxVisiblePages = 5; // Số trang hiển thị tối đa
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Điều chỉnh lại startPage nếu cần
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Tạo nút trang đầu nếu cần
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => onPageChange(1));
        paginationContainer.appendChild(firstPageButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationContainer.appendChild(ellipsis);
        }
    }
    
    // Tạo các nút trang
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.addEventListener('click', () => onPageChange(i));
        paginationContainer.appendChild(pageButton);
    }
    
    // Tạo nút trang cuối nếu cần
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationContainer.appendChild(ellipsis);
        }
        
        const lastPageButton = document.createElement('button');
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => onPageChange(totalPages));
        paginationContainer.appendChild(lastPageButton);
    }
    
    // Tạo nút trang sau
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Sau';
    nextButton.disabled = currentPage >= totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextButton);
}

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hàm lưu trữ dữ liệu vào localStorage
function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Hàm lấy dữ liệu từ localStorage
function getFromLocalStorage(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

// Hàm xóa dữ liệu từ localStorage
function removeFromLocalStorage(key) {
    localStorage.removeItem(key);
}

// Hàm xóa toàn bộ dữ liệu trong localStorage
function clearLocalStorage() {
    localStorage.clear();
}