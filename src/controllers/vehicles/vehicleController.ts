// controllers/car.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { CarModel, ICar } from '../../models/vehicles/vehicle_model';

interface CarIdParams {
  id: string;
}

interface CarQuery {
  brand?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  storeVerified?: string;
  isFavorite?: string;
  search?: string;
  sortBy?: string;
  order?: string;
  page?: string;
  limit?: string;
}

// ---------- Helpers ----------
const isValidObjectId = (id: string) => Types.ObjectId.isValid(id);

// ---------- CREATE ----------
export const createCar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const car = await CarModel.create(req.body);
    return res.status(201).json({ success: true, data: car });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- GET ALL (with filters, search, sort, pagination) ----------
export const getCars = async (
  req: Request<{}, {}, {}, CarQuery>,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      brand,
      condition,
      minPrice,
      maxPrice,
      storeVerified,
      isFavorite,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const match: Record<string, any> = {};

    if (brand) match.brand = new RegExp(`^${brand}$`, 'i');
    if (condition) match.condition = condition;
    if (storeVerified !== undefined) match.storeVerified = storeVerified === 'true';
    if (isFavorite !== undefined) match.isFavorite = isFavorite === 'true';

    if (search) {
      match.$or = [
        { name: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { storeName: new RegExp(search, 'i') },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === 'asc' ? 1 : -1;

    // Whitelist sortable fields so an arbitrary client value can't be injected into $sort
    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'brand',
      'rating',
      'reviewCount',
      'priceValue',
    ]);
    const sortField = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';

    const pipeline: any[] = [
      // Derive a numeric price from the string field, e.g. "$25,000" -> 25000
      {
        $addFields: {
          priceValue: {
            $convert: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: '$price',
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '$',
                  replacement: '',
                },
              },
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $match: match },
    ];

    if (minPrice || maxPrice) {
      const priceMatch: Record<string, number> = {};
      if (minPrice) priceMatch.$gte = parseFloat(minPrice);
      if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);
      pipeline.push({ $match: { priceValue: priceMatch } });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { [sortField]: sortOrder } },
          { $skip: skip },
          { $limit: limitNum },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await CarModel.aggregate(pipeline);

    const cars = result[0]?.data ?? [];
    const total = result[0]?.totalCount?.[0]?.count ?? 0;

    return res.status(200).json({
      success: true,
      data: cars,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- GET ONE ----------
export const getCarById = async (
  req: Request<CarIdParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    return res.status(200).json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE ----------
export const updateCar = async (
  req: Request<CarIdParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    return res.status(200).json({ success: true, data: car });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- DELETE ----------
export const deleteCar = async (
  req: Request<CarIdParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findByIdAndDelete(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    return res.status(200).json({ success: true, message: 'Car deleted' });
  } catch (err) {
    next(err);
  }
};

// ---------- TOGGLE FAVORITE ----------
export const toggleFavorite = async (
  req: Request<CarIdParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    car.isFavorite = !car.isFavorite;
    await car.save();

    return res.status(200).json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
};

// ---------- GET FAVORITES ----------
export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cars = await CarModel.find({ isFavorite: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: cars });
  } catch (err) {
    next(err);
  }
};

// ---------- GET DISTINCT BRANDS ----------
export const getBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await CarModel.distinct('brand');
    return res.status(200).json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
};