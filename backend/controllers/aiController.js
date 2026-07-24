const { validationResult } = require("express-validator");
const Room = require("../models/Room");
const { generateSummary } = require("../services/aiService");

const summarizeRoom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const room = await Room.findOne({ code: req.body.roomCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const textItems = room.strokes
      .filter((s) => s.tool === "text" && s.content && s.content.trim().length > 0)
      .map((s) => s.content.trim())
      .slice(0, 100);

    const shapeCounts = room.strokes.reduce((acc, s) => {
      if (s.tool !== "text") acc[s.tool] = (acc[s.tool] || 0) + 1;
      return acc;
    }, {});
    const shapeSummary = Object.keys(shapeCounts).length
      ? Object.entries(shapeCounts).map(([tool, count]) => `${count} ${tool}`).join(", ")
      : "none";

    if (textItems.length === 0) {
      return res.status(200).json({
        success: true,
        hasContent: false,
        summary:
          "This whiteboard doesn't have any typed text yet. Add some notes with the Text tool, then generate a summary again.",
      });
    }

    const summary = await generateSummary({ textItems, shapeSummary });

    return res.status(200).json({
      success: true,
      hasContent: true,
      summary,
      meta: { textItemCount: textItems.length, shapeSummary },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { summarizeRoom };
