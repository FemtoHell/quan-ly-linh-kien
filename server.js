// Khai báo các thư viện cần thiết
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { connectToDb, getDb } = require('./public/javascripts/mongodb');

// Khởi tạo Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
}));

// Biến lưu trữ kết nối database
let db;

// Kết nối MongoDB và khởi động server
connectToDb((err) => {
    if (err) {
        console.error('Không thể kết nối đến MongoDB:', err);
        return;
    }
    
    // Lấy instance database khi kết nối thành công
    db = getDb();
    
    // Khởi động server
    app.listen(PORT, () => {
        console.log(`Server đang chạy tại http://127.0.0.1:${PORT}`);
        
        // Kiểm tra và tự động import dữ liệu mẫu nếu collection trống
        initializeDatabase();
    });
});

// Hàm khởi tạo dữ liệu mẫu nếu cần
const initializeDatabase = async () => {
    try {
        // Kiểm tra xem collection có dữ liệu chưa
        const count = await db.collection('linhKien').countDocuments();
        
        if (count === 0) {
            console.log('Collection linhKien trống. Đang import dữ liệu mẫu...');
            
            // Đọc file JSON
            const jsonData = JSON.parse(fs.readFileSync('./JSON/LinhKienMayTinh.json', 'utf8'));
            
            // Import vào database
            const result = await db.collection('linhKien').insertMany(jsonData);
            
            console.log(`Đã import ${result.insertedCount} linh kiện vào database.`);
        } else {
            console.log(`Collection linhKien đã có ${count} documents.`);
        }
    } catch (error) {
        console.error('Lỗi khi khởi tạo database:', error);
    }
};

// Đọc dữ liệu JSON
const readJsonFile = () => {
    try {
        const data = fs.readFileSync('./JSON/LinhKienMayTinh.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Lỗi khi đọc file JSON:', error);
        return [];
    }
};

// Ghi dữ liệu JSON
const writeJsonFile = (data) => {
    try {
        fs.writeFileSync('./JSON/LinhKienMayTinh.json', JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Lỗi khi ghi file JSON:', error);
        return false;
    }
};

// ===== ROUTES =====

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'home.html'));
});

// Route lấy tất cả linh kiện và phân trang
app.get('/api/linhkien', async (req, res) => {
    try {
        // Lấy tham số phân trang từ query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Lấy tham số sắp xếp
        const sortField = req.query.sortField || 'id';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
        const sortOptions = {};
        sortOptions[sortField] = sortOrder;
        
        // Tạo query filter
        let filter = {};
        
        // Tìm kiếm theo loại
        if (req.query.loai) {
            filter.loai = req.query.loai;
        }
        
        // Tìm kiếm gần đúng theo tên
        if (req.query.name) {
            filter.name = { $regex: req.query.name, $options: 'i' };
        }
        
        // Tìm kiếm theo khoảng giá
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) {
                filter.price.$gte = parseInt(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter.price.$lte = parseInt(req.query.maxPrice);
            }
        }
        
        // Tìm kiếm theo tình trạng
        if (req.query.tinhTrang) {
            filter.tinhTrang = req.query.tinhTrang;
        }
        
        // Thực hiện query
        const products = await db.collection('linhKien')
            .find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .toArray();
        
        // Đếm tổng số mẫu tin
        const total = await db.collection('linhKien').countDocuments(filter);
        
        res.json({
            products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route lấy linh kiện theo ID
app.get('/api/linhkien/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const product = await db.collection('linhKien').findOne({ id });
        
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy linh kiện' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Lỗi khi lấy linh kiện theo ID:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route thêm linh kiện mới
app.post('/api/linhkien', async (req, res) => {
    try {
        // Lấy dữ liệu từ request
        const newProduct = req.body;
        
        // Kiểm tra ID hợp lệ (3 ký tự chữ + 5 ký tự số)
        const idPattern = /^[a-zA-Z]{3}\d{5}$/;
        if (!idPattern.test(newProduct.id)) {
            return res.status(400).json({ 
                message: 'ID không hợp lệ. ID phải gồm 3 ký tự chữ và 5 ký tự số'
            });
        }
        
        // Kiểm tra ID đã tồn tại chưa
        const existingProduct = await db.collection('linhKien').findOne({ id: newProduct.id });
        if (existingProduct) {
            return res.status(400).json({ message: 'ID đã tồn tại' });
        }
        
        // Upload hình ảnh nếu có
        if (req.files && req.files.image) {
            const imageFile = req.files.image;
            const imageName = `${newProduct.id}.jpg`;
            const uploadPath = path.join(__dirname, 'public', 'images', imageName);
            
            // Di chuyển file ảnh
            await imageFile.mv(uploadPath);
            newProduct.image = imageName;
        } else {
            // Sử dụng tên file mặc định dựa trên ID
            newProduct.image = `${newProduct.id}.jpg`;
        }
        
        // Thêm vào database
        await db.collection('linhKien').insertOne(newProduct);
        
        // Cập nhật file JSON
        const jsonData = readJsonFile();
        jsonData.push(newProduct);
        writeJsonFile(jsonData);
        
        res.status(201).json({ message: 'Thêm linh kiện thành công', product: newProduct });
    } catch (error) {
        console.error('Lỗi khi thêm linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route thêm nhiều linh kiện
app.post('/api/linhkien/batch', async (req, res) => {
    try {
        const products = req.body;
        
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
        
        // Kiểm tra ID hợp lệ và trùng lặp
        const idPattern = /^[a-zA-Z]{3}\d{5}$/;
        const existingIds = await db.collection('linhKien')
            .find({}, { projection: { id: 1 } })
            .toArray()
            .then(items => items.map(item => item.id));
        
        const validProducts = products.filter(product => {
            return idPattern.test(product.id) && !existingIds.includes(product.id);
        });
        
        if (validProducts.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm nào hợp lệ để thêm' });
        }
        
        // Thêm vào database
        await db.collection('linhKien').insertMany(validProducts);
        
        // Cập nhật file JSON
        const jsonData = readJsonFile();
        validProducts.forEach(product => jsonData.push(product));
        writeJsonFile(jsonData);
        
        res.status(201).json({ 
            message: `Thêm thành công ${validProducts.length} sản phẩm`,
            addedCount: validProducts.length,
            totalCount: products.length
        });
    } catch (error) {
        console.error('Lỗi khi thêm nhiều linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route cập nhật linh kiện
app.put('/api/linhkien/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        
        // Không cho phép thay đổi ID
        delete updatedData.id;
        
        // Kiểm tra sản phẩm tồn tại
        const existingProduct = await db.collection('linhKien').findOne({ id });
        if (!existingProduct) {
            return res.status(404).json({ message: 'Không tìm thấy linh kiện' });
        }
        
        // Upload hình ảnh nếu có
        if (req.files && req.files.image) {
            const imageFile = req.files.image;
            const imageName = `${id}.jpg`;
            const uploadPath = path.join(__dirname, 'public', 'images', imageName);
            
            // Di chuyển file ảnh
            await imageFile.mv(uploadPath);
            updatedData.image = imageName;
        }
        
        // Cập nhật trong database
        await db.collection('linhKien').updateOne(
            { id },
            { $set: updatedData }
        );
        
        // Cập nhật file JSON
        const jsonData = readJsonFile();
        const index = jsonData.findIndex(item => item.id === id);
        if (index !== -1) {
            jsonData[index] = { ...jsonData[index], ...updatedData };
            writeJsonFile(jsonData);
        }
        
        res.json({ message: 'Cập nhật linh kiện thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route cập nhật nhiều linh kiện
app.put('/api/linhkien', async (req, res) => {
    try {
        const updates = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
        
        // Thực hiện cập nhật từng sản phẩm
        let updatedCount = 0;
        for (const update of updates) {
            if (!update.id) continue;
            
            const id = update.id;
            const updateData = { ...update };
            delete updateData.id;
            
            const result = await db.collection('linhKien').updateOne(
                { id },
                { $set: updateData }
            );
            
            if (result.modifiedCount > 0) {
                updatedCount++;
            }
        }
        
        // Cập nhật file JSON
        if (updatedCount > 0) {
            const jsonData = readJsonFile();
            updates.forEach(update => {
                const index = jsonData.findIndex(item => item.id === update.id);
                if (index !== -1) {
                    const updateData = { ...update };
                    delete updateData.id;
                    jsonData[index] = { ...jsonData[index], ...updateData };
                }
            });
            writeJsonFile(jsonData);
        }
        
        res.json({ 
            message: `Cập nhật thành công ${updatedCount} sản phẩm`,
            updatedCount
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật nhiều linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route xóa linh kiện
app.delete('/api/linhkien/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Xóa trong database
        const result = await db.collection('linhKien').deleteOne({ id });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy linh kiện' });
        }
        
        // Xóa file ảnh nếu có
        const imagePath = path.join(__dirname, 'public', 'images', `${id}.jpg`);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        
        // Cập nhật file JSON
        const jsonData = readJsonFile();
        const updatedData = jsonData.filter(item => item.id !== id);
        writeJsonFile(updatedData);
        
        res.json({ message: 'Xóa linh kiện thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route xóa nhiều linh kiện
app.delete('/api/linhkien', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
        
        // Xóa trong database
        const result = await db.collection('linhKien').deleteMany({ id: { $in: ids } });
        
        // Xóa file ảnh nếu có
        ids.forEach(id => {
            const imagePath = path.join(__dirname, 'public', 'images', `${id}.jpg`);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });
        
        // Cập nhật file JSON
        const jsonData = readJsonFile();
        const updatedData = jsonData.filter(item => !ids.includes(item.id));
        writeJsonFile(updatedData);
        
        res.json({ 
            message: `Xóa thành công ${result.deletedCount} sản phẩm`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Lỗi khi xóa nhiều linh kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route lấy danh sách loại sản phẩm
app.get('/api/loai', async (req, res) => {
    try {
        const categories = await db.collection('linhKien').distinct('loai');
        res.json(categories);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách loại:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route cho trang Create
app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'create.html'));
});

// Route cho trang Update
app.get('/update', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'update.html'));
});

// Route cho trang Delete
app.get('/delete', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'delete.html'));
});

// Route tìm kiếm với regex
app.get('/api/search/regex', async (req, res) => {
    try {
        const { field, pattern, options } = req.query;
        
        if (!field || !pattern) {
            return res.status(400).json({ message: 'Thiếu tham số tìm kiếm' });
        }
        
        const query = {};
        query[field] = { $regex: pattern, $options: options || 'i' };
        
        const results = await db.collection('linhKien').find(query).toArray();
        
        res.json(results);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm với regex:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route tìm kiếm trong khoảng giá trị
app.get('/api/search/range', async (req, res) => {
    try {
        const { field, min, max } = req.query;
        
        if (!field) {
            return res.status(400).json({ message: 'Thiếu tham số tìm kiếm' });
        }
        
        const query = {};
        query[field] = {};
        
        if (min !== undefined && min !== '') {
            query[field].$gte = Number(min);
        }
        
        if (max !== undefined && max !== '') {
            query[field].$lte = Number(max);
        }
        
        const results = await db.collection('linhKien').find(query).toArray();
        
        res.json(results);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm trong khoảng:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route tìm kiếm với nhiều điều kiện
app.get('/api/search/multiple', async (req, res) => {
    try {
        const { conditions, type } = req.query;
        
        if (!conditions || !Array.isArray(JSON.parse(conditions))) {
            return res.status(400).json({ message: 'Điều kiện tìm kiếm không hợp lệ' });
        }
        
        const parsedConditions = JSON.parse(conditions);
        
        let query = {};
        if (type === 'or') {
            query = { $or: parsedConditions };
        } else {
            query = { $and: parsedConditions };
        }
        
        const results = await db.collection('linhKien').find(query).toArray();
        
        res.json(results);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm với nhiều điều kiện:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route tìm ID lớn nhất theo loại
app.get('/api/maxid/:type', async (req, res) => {
    try {
        const type = req.params.type;
        
        // Tạo regex pattern để tìm các ID theo loại (3 ký tự đầu)
        const regexPattern = new RegExp(`^${type.toLowerCase()}\\d{5}$`, 'i');
        
        const result = await db.collection('linhKien')
            .find({ id: { $regex: regexPattern } })
            .sort({ id: -1 })
            .limit(1)
            .toArray();
        
        if (result.length === 0) {
            // Nếu không có ID nào, trả về ID mặc định theo loại + 00000
            return res.json({ maxId: `${type.toLowerCase()}00000` });
        }
        
        res.json({ maxId: result[0].id });
    } catch (error) {
        console.error('Lỗi khi tìm ID lớn nhất:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route tạo ID tự động theo loại
app.get('/api/nextid/:type', async (req, res) => {
    try {
        const type = req.params.type;
        
        // Lấy ID lớn nhất
        const regexPattern = new RegExp(`^${type.toLowerCase()}\\d{5}$`, 'i');
        
        const result = await db.collection('linhKien')
            .find({ id: { $regex: regexPattern } })
            .sort({ id: -1 })
            .limit(1)
            .toArray();
        
        let nextId;
        
        if (result.length === 0) {
            // Nếu không có ID nào, bắt đầu từ 00001
            nextId = `${type.toLowerCase()}00001`;
        } else {
            // Tách phần chữ và phần số
            const maxId = result[0].id;
            const prefix = maxId.substring(0, 3);
            const numericPart = parseInt(maxId.substring(3), 10);
            
            // Tăng giá trị số và định dạng lại thành chuỗi có độ dài 5
            const nextNumeric = numericPart + 1;
            const paddedNumeric = nextNumeric.toString().padStart(5, '0');
            
            nextId = `${prefix}${paddedNumeric}`;
        }
        
        res.json({ nextId });
    } catch (error) {
        console.error('Lỗi khi tạo ID tự động:', error);
        res.status(500).json({ error: error.message });
    }
});

// Đường dẫn cho trang tìm kiếm theo loại
app.get('/read/for/update', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ message: 'Thiếu User ID' });
        }
        
        // Tìm kiếm với regex (không phân biệt chữ hoa/thường)
        const query = { id: { $regex: userId, $options: 'i' } };
        const user = await db.collection('linhKien').findOne(query);
        
        if (!user) {
            return res.redirect('/update?error=Không tìm thấy linh kiện với ID ' + userId);
        }
        
        // Chuyển hướng đến trang update với thông tin user
        const queryParams = new URLSearchParams();
        Object.entries(user).forEach(([key, value]) => {
            queryParams.append(key, value);
        });
        
        res.redirect('/update?' + queryParams.toString());
    } catch (error) {
        console.error('Lỗi khi tìm kiếm linh kiện cho update:', error);
        res.redirect('/update?error=' + error.message);
    }
});


app.use((req, res) => {
    res.status(404).json({ message: 'Không tìm thấy trang' });
});

module.exports = app;