// user
import React from "react";
import HeroSection from "../components/home/HeroSection";
import WhyChooseUs from "../components/home/WhyChooseUs";
import ShopByCategory from "../components/home/ShopByCategory";
import ShopByPieceType from "../components/home/ShopByPieceType";
import NewArrivals from "../components/home/NewArrivals";
import TrustFeatures from "../components/home/TrustFeatures";
import OurStory from "../components/home/OurStory";
import PieceJourney from "../components/home/PieceJourney";
import LuxuryBrands from "../components/home/LuxuryBrands";
import Testimonials from "../components/home/Testimonials";

/*
  Home
  - الصفحة الرئيسية - رح نبنيها قسم قسم من فوق لتحت
  - القسم الأول: HeroSection (منجز)
  - القسم الثاني: WhyChooseUs (منجز)
  - القسم الثالث: ShopByCategory - تصفح حسب الفئة (منجز)
  - باقي الأقسام رح تنضاف تباعًا تحت بعض هون
*/
const Home = () => {
  return (
    <div className="home-page">
      <HeroSection />
      <WhyChooseUs />
      <NewArrivals />
      <ShopByCategory />
      <ShopByPieceType />
      <TrustFeatures />
      <OurStory />
      <PieceJourney />
      <Testimonials />
      <LuxuryBrands />
    </div>
  );
};

export default Home;
