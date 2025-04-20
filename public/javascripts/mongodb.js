// Import thư viện MongoDB
const { MongoClient } = require('mongodb');

// Chuỗi kết nối

const connectionString = 'mongodb://127.0.0.1:27017/';

// Tên database
const dbName = 'linhKienMayTinhDB';

// Tên collection
const collectionName = 'linhKien';

// Biến lưu trữ kết nối
let dbConnection;

// Module xuất các hàm kết nối và thao tác với MongoDB
module.exports = {
    // Hàm kết nối đến database
    connectToDb: (callback) => {
        MongoClient.connect(connectionString)
            .then((client) => {
                console.log('Đã kết nối thành công đến MongoDB');
                dbConnection = client.db(dbName);
                return callback();
            })
            .catch((err) => {
                console.error('Lỗi kết nối đến MongoDB:', err);
                return callback(err);
            });
    },

    // Hàm trả về instance database khi đã kết nối
    getDb: () => dbConnection,

    // Hàm tìm kiếm theo ID
    findById: async (id) => {
        try {
            return await dbConnection.collection(collectionName).findOne({ id });
        } catch (error) {
            console.error('Lỗi khi tìm kiếm theo ID:', error);
            throw error;
        }
    },

    // Hàm tìm kiếm tất cả linh kiện với phân trang
    findAll: async (page = 1, limit = 10, sortField = 'id', sortOrder = 1) => {
        try {
            const skip = (page - 1) * limit;
            const sort = {};
            sort[sortField] = sortOrder;

            const items = await dbConnection.collection(collectionName)
                .find()
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();
            
            const total = await dbConnection.collection(collectionName).countDocuments();
            
            return {
                items,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Lỗi khi tìm kiếm tất cả linh kiện:', error);
            throw error;
        }
    },

    // Hàm tìm kiếm với bộ lọc
    findWithFilters: async (filters = {}, page = 1, limit = 10, sortField = 'id', sortOrder = 1) => {
        try {
            const skip = (page - 1) * limit;
            const sort = {};
            sort[sortField] = sortOrder === 'desc' ? -1 : 1;

            // Xây dựng query filter
            const query = {};
            
            // Lọc theo loại
            if (filters.loai) {
                query.loai = filters.loai;
            }
            
            // Lọc theo tên (tìm kiếm gần đúng)
            if (filters.name) {
                query.name = { $regex: filters.name, $options: 'i' };
            }
            
            // Lọc theo khoảng giá
            if (filters.minPrice || filters.maxPrice) {
                query.price = {};
                if (filters.minPrice) {
                    query.price.$gte = parseInt(filters.minPrice);
                }
                if (filters.maxPrice) {
                    query.price.$lte = parseInt(filters.maxPrice);
                }
            }
            
            // Lọc theo tình trạng
            if (filters.tinhTrang) {
                query.tinhTrang = filters.tinhTrang;
            }

            const items = await dbConnection.collection(collectionName)
                .find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();
            
            const total = await dbConnection.collection(collectionName).countDocuments(query);
            
            return {
                items,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Lỗi khi tìm kiếm với bộ lọc:', error);
            throw error;
        }
    },

    // Hàm tìm kiếm với regex
    findWithRegex: async (field, pattern, options = 'i') => {
        try {
            const query = {};
            query[field] = { $regex: pattern, $options: options };
            return await dbConnection.collection(collectionName).find(query).toArray();
        } catch (error) {
            console.error('Lỗi khi tìm kiếm với regex:', error);
            throw error;
        }
    },

    // Hàm tìm kiếm theo khoảng giá trị số
    findInRange: async (field, min, max) => {
        try {
            const query = {};
            query[field] = {};
            
            if (min !== undefined && min !== null) {
                query[field].$gte = Number(min);
            }
            
            if (max !== undefined && max !== null) {
                query[field].$lte = Number(max);
            }
            
            return await dbConnection.collection(collectionName).find(query).toArray();
        } catch (error) {
            console.error('Lỗi khi tìm kiếm theo khoảng giá trị:', error);
            throw error;
        }
    },

    // Hàm tìm kiếm với nhiều điều kiện OR
    findWithOR: async (conditions) => {
        try {
            return await dbConnection.collection(collectionName).find({
                $or: conditions
            }).toArray();
        } catch (error) {
            console.error('Lỗi khi tìm kiếm với điều kiện OR:', error);
            throw error;
        }
    },

    // Hàm tìm kiếm với nhiều điều kiện AND
    findWithAND: async (conditions) => {
        try {
            return await dbConnection.collection(collectionName).find({
                $and: conditions
            }).toArray();
        } catch (error) {
            console.error('Lỗi khi tìm kiếm với điều kiện AND:', error);
            throw error;
        }
    },

    // Hàm thêm mới một linh kiện
    insertOne: async (linhKien) => {
        try {
            return await dbConnection.collection(collectionName).insertOne(linhKien);
        } catch (error) {
            console.error('Lỗi khi thêm linh kiện:', error);
            throw error;
        }
    },

    // Hàm thêm nhiều linh kiện
    insertMany: async (linhKienArray) => {
        try {
            return await dbConnection.collection(collectionName).insertMany(linhKienArray);
        } catch (error) {
            console.error('Lỗi khi thêm nhiều linh kiện:', error);
            throw error;
        }
    },

    // Hàm cập nhật một linh kiện
    updateOne: async (id, updateData) => {
        try {
            return await dbConnection.collection(collectionName).updateOne(
                { id },
                { $set: updateData }
            );
        } catch (error) {
            console.error('Lỗi khi cập nhật linh kiện:', error);
            throw error;
        }
    },

    // Hàm cập nhật nhiều linh kiện
    updateMany: async (filter, updateData) => {
        try {
            return await dbConnection.collection(collectionName).updateMany(
                filter,
                { $set: updateData }
            );
        } catch (error) {
            console.error('Lỗi khi cập nhật nhiều linh kiện:', error);
            throw error;
        }
    },

    // Hàm xóa một linh kiện
    deleteOne: async (id) => {
        try {
            return await dbConnection.collection(collectionName).deleteOne({ id });
        } catch (error) {
            console.error('Lỗi khi xóa linh kiện:', error);
            throw error;
        }
    },

    // Hàm xóa nhiều linh kiện
    deleteMany: async (filter) => {
        try {
            return await dbConnection.collection(collectionName).deleteMany(filter);
        } catch (error) {
            console.error('Lỗi khi xóa nhiều linh kiện:', error);
            throw error;
        }
    },

    // Hàm lấy danh sách các loại linh kiện
    getCategories: async () => {
        try {
            return await dbConnection.collection(collectionName).distinct('loai');
        } catch (error) {
            console.error('Lỗi khi lấy danh sách loại:', error);
            throw error;
        }
    },

    // Hàm tìm ID lớn nhất theo loại
    findMaxIdByType: async (type) => {
        try {
            // Tạo regex pattern để tìm các ID theo loại (3 ký tự đầu)
            const regexPattern = new RegExp(`^${type.toLowerCase()}\\d{5}$`, 'i');
            
            const result = await dbConnection.collection(collectionName)
                .find({ id: { $regex: regexPattern } })
                .sort({ id: -1 })
                .limit(1)
                .toArray();
            
            if (result.length === 0) {
                // Nếu không có ID nào, trả về ID mặc định theo loại + 00000
                return `${type.toLowerCase()}00000`;
            }
            
            return result[0].id;
        } catch (error) {
            console.error('Lỗi khi tìm ID lớn nhất:', error);
            throw error;
        }
    },

    // Hàm tạo ID tự động theo loại
    generateNextId: async (type) => {
        try {
            const maxId = await module.exports.findMaxIdByType(type);
            
            // Tách phần chữ và phần số
            const prefix = maxId.substring(0, 3);
            const numericPart = parseInt(maxId.substring(3), 10);
            
            // Tăng giá trị số và định dạng lại thành chuỗi có độ dài 5
            const nextNumeric = numericPart + 1;
            const paddedNumeric = nextNumeric.toString().padStart(5, '0');
            
            return `${prefix}${paddedNumeric}`;
        } catch (error) {
            console.error('Lỗi khi tạo ID tự động:', error);
            throw error;
        }
    },

    // Hàm nhập dữ liệu từ file JSON
    importFromJson: async (jsonData) => {
        try {
            // Xóa collection hiện tại (nếu cần)
            // await dbConnection.collection(collectionName).deleteMany({});
            
            // Nhập dữ liệu mới
            if (Array.isArray(jsonData) && jsonData.length > 0) {
                return await dbConnection.collection(collectionName).insertMany(jsonData);
            }
            
            return { acknowledged: true, insertedCount: 0 };
        } catch (error) {
            console.error('Lỗi khi nhập dữ liệu từ JSON:', error);
            throw error;
        }
    }
};