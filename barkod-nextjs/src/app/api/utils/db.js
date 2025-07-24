import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    // console.log("MongoDB bağlantısı başarılı");
  } catch (error) {
    // console.error("MongoDB bağlantı hatası:", error.message);
    throw new Error("MongoDB bağlantı hatası: " + error.message);
  }
};

export default connectDB;
