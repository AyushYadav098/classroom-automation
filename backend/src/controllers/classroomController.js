const Classroom = require('../models/Classroom');

exports.createClassroom = async (req, res) => {
  try {
    const { name, roomNumber, building, floor, esp32Id, capacity, facilities } = req.body;

    // Check if classroom exists
    const existingRoom = await Classroom.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({ 
        error: 'Room number already exists' 
      });
    }

    // Generate MQTT topic
    const mqttTopic = `classroom/${roomNumber.replace(/\s+/g, '_')}`;

    const classroom = new Classroom({
      name,
      roomNumber,
      building,
      floor,
      esp32Id,
      mqttTopic,
      capacity,
      facilities
    });

    await classroom.save();

    res.status(201).json({
      message: 'Classroom created successfully',
      classroom
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ isActive: true })
      .sort({ roomNumber: 1 });

    res.json({ classrooms });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    res.json({ classroom });
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};