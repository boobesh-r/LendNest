import { Request, Response } from 'express';
import { db } from '../database.js';
import { cleanupOrphanedItemImage } from '../services/imageService.js';

export class ItemController {
  static getItems(req: Request, res: Response) {
    try {
      const { search, category, maxPrice, location, availableOnly, sort } = req.query;

      let query = `
        SELECT i.*, u.name as owner_name, u.avatar_url as owner_avatar, u.location as owner_location
        FROM items i
        JOIN users u ON i.owner_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search && typeof search === 'string' && search.trim() !== '') {
        query += ` AND (i.title LIKE ? OR i.description LIKE ?)`;
        const wildcard = `%${search.trim()}%`;
        params.push(wildcard, wildcard);
      }

      if (category && typeof category === 'string' && category !== 'All' && category.trim() !== '') {
        query += ` AND i.category = ?`;
        params.push(category.trim());
      }

      if (maxPrice && !isNaN(Number(maxPrice))) {
        query += ` AND i.price_per_day <= ?`;
        params.push(Number(maxPrice));
      }

      if (location && typeof location === 'string' && location.trim() !== '') {
        query += ` AND i.location LIKE ?`;
        params.push(`%${location.trim()}%`);
      }

      if (availableOnly === 'true' || availableOnly === '1') {
        query += ` AND i.available = 1`;
      }

      // Sorting
      if (sort === 'price_asc') {
        query += ` ORDER BY i.price_per_day ASC`;
      } else if (sort === 'price_desc') {
        query += ` ORDER BY i.price_per_day DESC`;
      } else {
        query += ` ORDER BY i.created_at DESC`;
      }

      const items = db.prepare(query).all(...params);

      return res.json({
        success: true,
        count: items.length,
        items,
      });
    } catch (err: any) {
      console.error('[ItemController.getItems] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve items.' });
    }
  }

  static getItemById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid item ID.' });
      }

      const item = db.prepare(`
        SELECT i.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.avatar_url as owner_avatar, u.location as owner_location
        FROM items i
        JOIN users u ON i.owner_id = u.id
        WHERE i.id = ?
      `).get(id) as any;

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }

      // Check upcoming booked dates for this item so the UI can disable them
      const bookings = db.prepare(`
        SELECT start_date, end_date
        FROM bookings
        WHERE item_id = ? AND status IN ('confirmed', 'pending')
      `).all(id);

      return res.json({
        success: true,
        item: {
          ...item,
          bookedDates: bookings,
        },
      });
    } catch (err: any) {
      console.error('[ItemController.getItemById] Error:', err);
      return res.status(500).json({ success: false, message: 'Could not fetch item details.' });
    }
  }

  static createItem(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'You must be logged in to list an item.' });
      }

      const { title, description, category, price_per_day, deposit, location, image_url, item_condition } = req.body;

      if (!title || !description || !category || price_per_day === undefined || !location) {
        return res.status(400).json({ success: false, message: 'Please provide title, description, category, price, and location.' });
      }

      const numPrice = Number(price_per_day);
      const numDeposit = Number(deposit || 0);

      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Rental price per day must be a positive number.' });
      }

      if (isNaN(numDeposit) || numDeposit < 0) {
        return res.status(400).json({ success: false, message: 'Deposit amount cannot be negative.' });
      }

      const defaultImage = image_url?.trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

      const stmt = db.prepare(`
        INSERT INTO items (owner_id, title, description, category, price_per_day, deposit, location, image_url, item_condition, available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const result = stmt.run(
        req.user.id,
        title.trim(),
        description.trim(),
        category.trim(),
        numPrice,
        numDeposit,
        location.trim(),
        defaultImage,
        item_condition || 'Excellent'
      );

      const newItemId = Number(result.lastInsertRowid);
      const createdItem = db.prepare('SELECT * FROM items WHERE id = ?').get(newItemId);

      return res.status(201).json({
        success: true,
        message: 'Item listed successfully!',
        item: createdItem,
      });
    } catch (err: any) {
      console.error('[ItemController.createItem] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create item listing.' });
    }
  }

  static updateItem(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item listing not found.' });
      }

      // Security check: Must be owner or admin
      if (item.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'You do not have permission to modify this listing.' });
      }

      const { title, description, category, price_per_day, deposit, location, image_url, item_condition, available } = req.body;

      if (price_per_day !== undefined && (isNaN(Number(price_per_day)) || Number(price_per_day) <= 0)) {
        return res.status(400).json({ success: false, message: 'Rental price must be a positive number.' });
      }

      // If the listing image is being replaced, clean up old uploaded photo if not referenced elsewhere
      if (image_url !== undefined && image_url?.trim() && image_url.trim() !== item.image_url) {
        cleanupOrphanedItemImage(item.image_url, id);
      }

      db.prepare(`
        UPDATE items
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            category = COALESCE(?, category),
            price_per_day = COALESCE(?, price_per_day),
            deposit = COALESCE(?, deposit),
            location = COALESCE(?, location),
            image_url = COALESCE(?, image_url),
            item_condition = COALESCE(?, item_condition),
            available = COALESCE(?, available)
        WHERE id = ?
      `).run(
        title?.trim() || null,
        description?.trim() || null,
        category?.trim() || null,
        price_per_day !== undefined ? Number(price_per_day) : null,
        deposit !== undefined ? Number(deposit) : null,
        location?.trim() || null,
        image_url?.trim() || null,
        item_condition || null,
        available !== undefined ? (available ? 1 : 0) : null,
        id
      );

      const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(id);

      return res.json({
        success: true,
        message: 'Item updated successfully.',
        item: updated,
      });
    } catch (err: any) {
      console.error('[ItemController.updateItem] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update item.' });
    }
  }

  static deleteItem(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item listing not found.' });
      }

      if (item.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'You do not have permission to delete this listing.' });
      }

      // Clean up uploaded image if not referenced by other items
      cleanupOrphanedItemImage(item.image_url, id);

      db.prepare('DELETE FROM items WHERE id = ?').run(id);

      return res.json({
        success: true,
        message: 'Listing successfully removed.',
      });
    } catch (err: any) {
      console.error('[ItemController.deleteItem] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete item.' });
    }
  }
}

