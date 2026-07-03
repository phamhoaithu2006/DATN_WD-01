import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import Icon from "./Icon";
import { useLocale } from "../../contexts/LocaleContext";
import { categoryApi } from "../../services/categoryApi";
import { destinationApi } from "../../services/destinationApi";
import { fetchTours } from "../../services/customerApi";

// Detailed mock data structured for the Mega Menu categories, tabs, and content items
const megaMenuData = {
  "places-to-see": {
    label: { vi: "Điểm du lịch", en: "Places to see" },
    sidebar: [
      { id: "top-attractions", label: { vi: "Điểm du lịch nổi bật", en: "Top attractions" } },
      { id: "north-america", label: { vi: "Bắc Mỹ", en: "North America" } },
      { id: "europe", label: { vi: "Châu Âu", en: "Europe" } },
      { id: "africa", label: { vi: "Châu Phi", en: "Africa" } },
      { id: "central-south-america", label: { vi: "Trung & Nam Mỹ", en: "Central & South America" } },
      { id: "asia", label: { vi: "Châu Á", en: "Asia" } },
      { id: "australia-pacific", label: { vi: "Úc & Thái Bình Dương", en: "Australia & the Pacific" } }
    ],
    content: {
      "top-attractions": [
        {
          title: { vi: "Tháp Eiffel", en: "Eiffel Tower" },
          subtitle: { vi: "Kỳ quan tại Paris, Pháp", en: "Attraction in Paris, France" },
          image: "https://picsum.photos/seed/eiffel/80/80"
        },
        {
          title: { vi: "Đấu trường Colosseum", en: "Colosseum" },
          subtitle: { vi: "Kỳ quan tại Rome, Ý", en: "Attraction in Rome, Italy" },
          image: "https://picsum.photos/seed/colosseum/80/80"
        },
        {
          title: { vi: "Vịnh Hạ Long", en: "Ha Long Bay" },
          subtitle: { vi: "Kỳ quan tại Quảng Ninh, Việt Nam", en: "Attraction in Quang Ninh, Vietnam" },
          image: "https://picsum.photos/seed/halong/80/80"
        },
        {
          title: { vi: "Tượng Nữ thần Tự do", en: "Statue of Liberty" },
          subtitle: { vi: "Điểm tham quan tại New York, Mỹ", en: "Attraction in New York, USA" },
          image: "https://picsum.photos/seed/liberty/80/80"
        },
        {
          title: { vi: "Đền Taj Mahal", en: "Taj Mahal" },
          subtitle: { vi: "Kỳ quan tại Agra, Ấn Độ", en: "Attraction in Agra, India" },
          image: "https://picsum.photos/seed/tajmahal/80/80"
        },
        {
          title: { vi: "Núi Phú Sĩ", en: "Mount Fuji" },
          subtitle: { vi: "Kỳ quan tại Shizuoka, Nhật Bản", en: "Attraction in Shizuoka, Japan" },
          image: "https://picsum.photos/seed/fuji/80/80"
        }
      ],
      "north-america": [
        {
          title: { vi: "Hẻm núi Grand Canyon", en: "Grand Canyon" },
          subtitle: { vi: "Vườn quốc gia tại Arizona, Mỹ", en: "National Park in Arizona, USA" },
          image: "https://picsum.photos/seed/grandcanyon/80/80"
        },
        {
          title: { vi: "Thác Niagara", en: "Niagara Falls" },
          subtitle: { vi: "Kỳ quan thiên nhiên tại New York, Mỹ", en: "Natural Wonder in New York, USA" },
          image: "https://picsum.photos/seed/niagara/80/80"
        },
        {
          title: { vi: "Công viên Yellowstone", en: "Yellowstone National Park" },
          subtitle: { vi: "Vườn quốc gia tại Wyoming, Mỹ", en: "National Park in Wyoming, USA" },
          image: "https://picsum.photos/seed/yellowstone/80/80"
        }
      ],
      "europe": [
        {
          title: { vi: "Tháp Eiffel", en: "Eiffel Tower" },
          subtitle: { vi: "Kỳ quan tại Paris, Pháp", en: "Attraction in Paris, France" },
          image: "https://picsum.photos/seed/eiffel/80/80"
        },
        {
          title: { vi: "Kênh đào Venice", en: "Venice Canals" },
          subtitle: { vi: "Điểm lãng mạn tại Venice, Ý", en: "Romantic Landmark in Venice, Italy" },
          image: "https://picsum.photos/seed/venice/80/80"
        },
        {
          title: { vi: "Bảo tàng Louvre", en: "Louvre Museum" },
          subtitle: { vi: "Bảo tàng nghệ thuật tại Paris, Pháp", en: "Art Museum in Paris, France" },
          image: "https://picsum.photos/seed/louvre/80/80"
        }
      ],
      "africa": [
        {
          title: { vi: "Kim tự tháp Giza", en: "Pyramids of Giza" },
          subtitle: { vi: "Di tích lịch sử tại Cairo, Ai Cập", en: "Historic Site in Cairo, Egypt" },
          image: "https://picsum.photos/seed/pyramids/80/80"
        },
        {
          title: { vi: "Vườn quốc gia Serengeti", en: "Serengeti National Park" },
          subtitle: { vi: "Khu bảo tồn động vật tại Tanzania", en: "Wildlife Reserve in Tanzania" },
          image: "https://picsum.photos/seed/serengeti/80/80"
        },
        {
          title: { vi: "Núi Bàn (Table Mountain)", en: "Table Mountain" },
          subtitle: { vi: "Kỳ quan thiên nhiên tại Cape Town, Nam Phi", en: "Natural Wonder in Cape Town, South Africa" },
          image: "https://picsum.photos/seed/tablemountain/80/80"
        }
      ],
      "central-south-america": [
        {
          title: { vi: "Machu Picchu", en: "Machu Picchu" },
          subtitle: { vi: "Thành phố cổ đại tại Cusco, Peru", en: "Ancient City in Cusco, Peru" },
          image: "https://picsum.photos/seed/machupicchu/80/80"
        },
        {
          title: { vi: "Tượng Chúa cứu thế", en: "Christ the Redeemer" },
          subtitle: { vi: "Tượng đài kỳ quan tại Rio de Janeiro, Brazil", en: "Iconic Statue in Rio de Janeiro, Brazil" },
          image: "https://picsum.photos/seed/christ/80/80"
        },
        {
          title: { vi: "Quần đảo Galapagos", en: "Galapagos Islands" },
          subtitle: { vi: "Kỳ quan đa dạng sinh học tại Ecuador", en: "Biodiverse Sanctuary in Ecuador" },
          image: "https://picsum.photos/seed/galapagos/80/80"
        }
      ],
      "asia": [
        {
          title: { vi: "Đền Angkor Wat", en: "Angkor Wat" },
          subtitle: { vi: "Kỳ quan tôn giáo tại Siem Reap, Campuchia", en: "Temple Complex in Siem Reap, Cambodia" },
          image: "https://picsum.photos/seed/angkor/80/80"
        },
        {
          title: { vi: "Vịnh Hạ Long", en: "Ha Long Bay" },
          subtitle: { vi: "Kỳ quan thiên nhiên tại Quảng Ninh, Việt Nam", en: "Attraction in Quang Ninh, Vietnam" },
          image: "https://picsum.photos/seed/halong/80/80"
        },
        {
          title: { vi: "Vạn Lý Trường Thành", en: "Great Wall of China" },
          subtitle: { vi: "Di tích lịch sử tại Bắc Kinh, Trung Quốc", en: "Historic Wall in Beijing, China" },
          image: "https://picsum.photos/seed/greatwall/80/80"
        }
      ],
      "australia-pacific": [
        {
          title: { vi: "Nhà hát Opera Sydney", en: "Sydney Opera House" },
          subtitle: { vi: "Công trình biểu tượng tại Sydney, Úc", en: "Iconic Theatre in Sydney, Australia" },
          image: "https://picsum.photos/seed/opera/80/80"
        },
        {
          title: { vi: "Rạn san hô Great Barrier", en: "Great Barrier Reef" },
          subtitle: { vi: "Kỳ quan san hô tại Queensland, Úc", en: "Coral Reef System in Queensland, Australia" },
          image: "https://picsum.photos/seed/reef/80/80"
        },
        {
          title: { vi: "Vườn quốc gia Fiordland", en: "Fiordland National Park" },
          subtitle: { vi: "Cảnh quan thiên nhiên tại New Zealand", en: "Glacial Fjord System in New Zealand" },
          image: "https://picsum.photos/seed/fiordland/80/80"
        }
      ]
    }
  },
  "things-to-do": {
    label: { vi: "Trải nghiệm", en: "Things to do" },
    sidebar: [
      { id: "all-activities", label: { vi: "Tất cả hoạt động", en: "All activities" } },
      { id: "outdoor-adventures", label: { vi: "Phiêu lưu ngoài trời", en: "Outdoor adventures" } },
      { id: "cultural-tours", label: { vi: "Tour văn hóa", en: "Cultural tours" } },
      { id: "food-dining", label: { vi: "Ẩm thực & Nhà hàng", en: "Food & dining" } },
      { id: "water-sports", label: { vi: "Thể thao dưới nước", en: "Water sports" } }
    ],
    content: {
      "all-activities": [
        {
          title: { vi: "Chèo thuyền Kayak", en: "Kayaking tour" },
          subtitle: { vi: "Chèo kayak ngắm cảnh vịnh", en: "Kayaking adventure in scenic bays" },
          image: "https://picsum.photos/seed/kayak/80/80"
        },
        {
          title: { vi: "Khám phá ẩm thực đường phố", en: "Street food crawl" },
          subtitle: { vi: "Thưởng thức ẩm thực đặc trưng bản địa", en: "Taste local food guided by experts" },
          image: "https://picsum.photos/seed/streetfood/80/80"
        },
        {
          title: { vi: "Nhảy dù lượn", en: "Paragliding" },
          subtitle: { vi: "Nhảy dù từ đỉnh núi", en: "Glide from peaks with professional guide" },
          image: "https://picsum.photos/seed/paragliding/80/80"
        }
      ],
      "outdoor-adventures": [
        {
          title: { vi: "Leo núi chinh phục đỉnh Fansipan", en: "Trek Mount Fansipan" },
          subtitle: { vi: "Chinh phục đỉnh núi cao nhất Đông Dương", en: "Hiking tour to Indochina Summit" },
          image: "https://picsum.photos/seed/trekking/80/80"
        },
        {
          title: { vi: "Nhảy dù lượn", en: "Paragliding" },
          subtitle: { vi: "Nhảy dù từ đỉnh núi", en: "Glide from peaks with professional guide" },
          image: "https://picsum.photos/seed/paragliding/80/80"
        }
      ],
      "cultural-tours": [
        {
          title: { vi: "Tham quan bảo tàng di tích", en: "Museum tour" },
          subtitle: { vi: "Khám phá chiều sâu lịch sử văn hóa", en: "Guided walk through historical museums" },
          image: "https://picsum.photos/seed/museum/80/80"
        },
        {
          title: { vi: "Xem biểu diễn Múa rối nước", en: "Water puppet show" },
          subtitle: { vi: "Nghệ thuật dân gian truyền thống độc đáo", en: "Traditional Vietnamese performance art" },
          image: "https://picsum.photos/seed/puppet/80/80"
        }
      ],
      "food-dining": [
        {
          title: { vi: "Khám phá ẩm thực đường phố", en: "Street food crawl" },
          subtitle: { vi: "Thưởng thức ẩm thực đặc trưng bản địa", en: "Taste local food guided by experts" },
          image: "https://picsum.photos/seed/streetfood/80/80"
        },
        {
          title: { vi: "Lớp học nấu ăn truyền thống", en: "Cooking class" },
          subtitle: { vi: "Tự tay làm món ăn bản địa", en: "Learn local cooking techniques from chef" },
          image: "https://picsum.photos/seed/cooking/80/80"
        }
      ],
      "water-sports": [
        {
          title: { vi: "Chèo thuyền Kayak", en: "Kayaking tour" },
          subtitle: { vi: "Chèo kayak ngắm cảnh vịnh", en: "Kayaking adventure in scenic bays" },
          image: "https://picsum.photos/seed/kayak/80/80"
        },
        {
          title: { vi: "Lặn ngắm san hô", en: "Scuba diving" },
          subtitle: { vi: "Khám phá hệ sinh thái đại dương", en: "Explore colorful reefs and marine life" },
          image: "https://picsum.photos/seed/scubadiving/80/80"
        }
      ]
    }
  },
  "trip-inspiration": {
    label: { vi: "Cảm hứng", en: "Trip inspiration" },
    sidebar: [
      { id: "all-guides", label: { vi: "Tất cả cẩm nang", en: "All guides" } },
      { id: "romantic-getaways", label: { vi: "Kỳ nghỉ lãng mạn", en: "Romantic getaways" } },
      { id: "family-vacations", label: { vi: "Kỳ nghỉ gia đình", en: "Family vacations" } },
      { id: "solo-travel", label: { vi: "Du lịch một mình", en: "Solo travel" } }
    ],
    content: {
      "all-guides": [
        {
          title: { vi: "Top 10 bãi biển mùa hè đẹp nhất", en: "Top 10 summer beaches" },
          subtitle: { vi: "Ý tưởng cho kỳ nghỉ tuyệt vời của bạn", en: "Inspirational guide for beach lovers" },
          image: "https://picsum.photos/seed/beachguide/80/80"
        },
        {
          title: { vi: "Cẩm nang leo núi Sa Pa an toàn", en: "Hiking Sapa safely" },
          subtitle: { vi: "Kinh nghiệm thực tế từ các chuyên gia", en: "Ultimate trekking tips from local guides" },
          image: "https://picsum.photos/seed/sapaguide/80/80"
        }
      ],
      "romantic-getaways": [
        {
          title: { vi: "Tuần trăng mật lãng mạn tại Phú Quốc", en: "Honeymoon in Phu Quoc" },
          subtitle: { vi: "Resort sang trọng bên bờ biển xanh cát trắng", en: "Romantic resort guides for couples" },
          image: "https://picsum.photos/seed/phuquocromantic/80/80"
        }
      ],
      "family-vacations": [
        {
          title: { vi: "Hành trình khám phá Đà Nẵng cùng gia đình", en: "Da Nang family guide" },
          subtitle: { vi: "Điểm tham quan thích hợp cho mọi lứa tuổi", en: "Fun activities for kids and elders" },
          image: "https://picsum.photos/seed/danangfamily/80/80"
        }
      ],
      "solo-travel": [
        {
          title: { vi: "Hành trình xuyên Việt một mình an toàn", en: "Solo across Vietnam" },
          subtitle: { vi: "Kinh nghiệm di chuyển và lưu trú tiết kiệm", en: "Practical tips for solo backpackers" },
          image: "https://picsum.photos/seed/vietnamsolo/80/80"
        }
      ]
    }
  }
};

function Header({ user, onLogout }) {
  const { language } = useLocale();
  const location = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [mobileAccordion, setMobileAccordion] = useState(null);
  const [menuOpenedByClick, setMenuOpenedByClick] = useState(false);
  const [menuData, setMenuData] = useState(megaMenuData);
  
  const headerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Load live category, destination, and tour data for the Mega Menu
  useEffect(() => {
    let active = true;

    async function loadMenuData() {
      try {
        const [destResponse, catResponse, toursData] = await Promise.all([
          destinationApi.getAll().catch(() => ({ data: [] })),
          categoryApi.getAll().catch(() => ({ data: [] })),
          fetchTours().catch(() => [])
        ]);

        if (!active) return;

        const destinations = Array.isArray(destResponse?.data?.data)
          ? destResponse.data.data
          : Array.isArray(destResponse?.data)
            ? destResponse.data
            : [];

        const categories = Array.isArray(catResponse?.data?.data)
          ? catResponse.data.data
          : Array.isArray(catResponse?.data)
            ? catResponse.data
            : [];

        const tours = Array.isArray(toursData) ? toursData : [];

        // Build Places to see (Điểm du lịch)
        const domesticDests = destinations.filter(d => {
          const c = (d.country || '').trim().toLowerCase();
          return c === 'việt nam' || c === 'viet nam' || c === '';
        });
        const intlDests = destinations.filter(d => {
          const c = (d.country || '').trim().toLowerCase();
          return c !== 'việt nam' && c !== 'viet nam' && c !== '';
        });

        const placesSidebar = [
          { id: "all-destinations", label: { vi: "Tất cả điểm đến", en: "All destinations" } }
        ];
        if (domesticDests.length > 0) {
          placesSidebar.push({ id: "vietnam", label: { vi: "Trong nước", en: "Domestic" } });
        }
        if (intlDests.length > 0) {
          placesSidebar.push({ id: "international", label: { vi: "Quốc tế", en: "International" } });
        }

        const placesContent = {
          "all-destinations": destinations.map(d => ({
            id: d.id,
            title: { vi: d.name, en: d.name },
            subtitle: { 
              vi: d.province_city ? `Điểm du lịch tại ${d.province_city}` : "Điểm du lịch nổi bật", 
              en: d.province_city ? `Attraction in ${d.province_city}` : "Top attraction" 
            },
            image: d.thumbnail_url || "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=120&q=80"
          })),
          "vietnam": domesticDests.map(d => ({
            id: d.id,
            title: { vi: d.name, en: d.name },
            subtitle: { 
              vi: d.province_city ? `Kỳ quan tại ${d.province_city}, Việt Nam` : "Kỳ quan tại Việt Nam", 
              en: d.province_city ? `Wonder in ${d.province_city}, Vietnam` : "Wonder in Vietnam" 
            },
            image: d.thumbnail_url || "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=120&q=80"
          })),
          "international": intlDests.map(d => ({
            id: d.id,
            title: { vi: d.name, en: d.name },
            subtitle: { 
              vi: `${d.province_city || ''}, ${d.country}`, 
              en: `${d.province_city || ''}, ${d.country}` 
            },
            image: d.thumbnail_url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80"
          }))
        };

        // Build Things to do (Trải nghiệm)
        const activeCategories = categories.filter(c => c.status === 'active' || c.status === undefined);
        const thingsSidebar = [
          { id: "all-activities", label: { vi: "Tất cả trải nghiệm", en: "All experiences" } }
        ];
        activeCategories.forEach(cat => {
          thingsSidebar.push({
            id: `cat-${cat.id}`,
            label: { vi: cat.name, en: cat.name }
          });
        });

        const thingsContent = {
          "all-activities": tours.slice(0, 9).map(tour => ({
            title: { vi: tour.title, en: tour.title },
            subtitle: {
              vi: tour.duration || `${tour.duration_days} ngày ${tour.duration_nights} đêm`,
              en: tour.duration || `${tour.duration_days} days ${tour.duration_nights} nights`
            },
            image: tour.thumbnail_url || tour.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
            slug: tour.slug
          }))
        };

        activeCategories.forEach(cat => {
          const catTours = tours.filter(tour => 
            tour.category_id === cat.id || 
            tour.category_info?.id === cat.id ||
            (tour.category && (tour.category === cat.name || tour.category.name === cat.name))
          );
          thingsContent[`cat-${cat.id}`] = catTours.slice(0, 9).map(tour => ({
            title: { vi: tour.title, en: tour.title },
            subtitle: {
              vi: tour.duration || `${tour.duration_days} ngày ${tour.duration_nights} đêm`,
              en: tour.duration || `${tour.duration_days} days ${tour.duration_nights} nights`
            },
            image: tour.thumbnail_url || tour.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
            slug: tour.slug
          }));
        });

        setMenuData({
          "places-to-see": {
            label: { vi: "Điểm du lịch", en: "Places to see" },
            sidebar: placesSidebar,
            content: placesContent
          },
          "things-to-do": {
            label: { vi: "Trải nghiệm", en: "Things to do" },
            sidebar: thingsSidebar,
            content: thingsContent
          },
          "trip-inspiration": megaMenuData["trip-inspiration"]
        });
      } catch (err) {
        console.error("Failed to load mega menu data:", err);
      }
    }

    loadMenuData();
    return () => {
      active = false;
    };
  }, []);

  // Auto-close menu drawer and dropdown on path navigation changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMenu(null);
    setMenuOpenedByClick(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Handle outside clicks to close active menus
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setActiveMenu(null);
        setMenuOpenedByClick(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Opens dropdown for a specific menu and defaults its active vertical tab
  const handleOpenDropdown = (menuKey) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    
    if (activeMenu === menuKey) {
      if (menuOpenedByClick) {
        // Toggle close if already clicked-open
        setActiveMenu(null);
        setMenuOpenedByClick(false);
      } else {
        // Transition hover-opened state to locked-clicked state
        setMenuOpenedByClick(true);
      }
    } else {
      // Open new menu and lock it open
      setActiveMenu(menuKey);
      setMenuOpenedByClick(true);
      const defaultTab = menuData[menuKey]?.sidebar[0]?.id || null;
      setActiveTab(defaultTab);
    }
  };

  const handleMouseEnterItem = (menuKey) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    
    setActiveMenu(menuKey);
    // Set default vertical tab if changing top-level menus
    if (activeMenu !== menuKey) {
      const defaultTab = menuData[menuKey]?.sidebar[0]?.id || null;
      setActiveTab(defaultTab);
    }
  };

  const handleMouseLeaveItem = () => {
    if (menuOpenedByClick) return; // Keep menu open if it was locked via click
    
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 250); // 250ms smooth hover timeout
  };

  const handleDropdownMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handleDropdownMouseLeave = () => {
    if (menuOpenedByClick) return; // Keep menu open if it was locked via click
    
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 250);
  };

  const activeMenuObj = menuData[activeMenu];
  const activeContentItems = activeMenuObj?.content[activeTab] || [];

  return (
    <header className="vg-header sticky top-0 z-[80]" ref={headerRef}>
      <div className="vg-container vg-navbar relative z-30">
        <BrandLogo />

        <button
          className="vg-mobile-menu"
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Mở menu"
        >
          <Icon name={mobileOpen ? "close" : "menu"} />
        </button>

        {/* Desktop Main Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 mx-auto relative h-full">
          <NavLink
            className={({ isActive }) =>
              `relative py-6 font-semibold text-[0.98rem] transition-colors duration-200 ${
                isActive ? "text-blue-600" : "text-[#111820] hover:text-blue-600"
              }`
            }
            to="/"
            end
          >
            {language === "vi" ? "Trang chủ" : "Home"}
          </NavLink>

          {Object.keys(menuData).map((menuKey) => {
            const menu = menuData[menuKey];
            const isMenuOpen = activeMenu === menuKey;
            const menuLabel = language === "vi" ? menu.label.vi : menu.label.en;

            return (
              <div
                key={menuKey}
                className="relative h-full flex items-center"
                onMouseEnter={() => handleMouseEnterItem(menuKey)}
                onMouseLeave={handleMouseLeaveItem}
              >
                <button
                  type="button"
                  className={`flex items-center gap-1.5 py-6 font-semibold text-[0.98rem] transition-colors duration-200 ${
                    isMenuOpen ? "text-blue-600" : "text-[#111820] hover:text-blue-600"
                  }`}
                  onClick={() => handleOpenDropdown(menuKey)}
                >
                  <span>{menuLabel}</span>
                  <span className={`transition-transform duration-200 ${isMenuOpen ? "rotate-180 text-blue-600" : "text-gray-400"}`}>
                    <Icon name="chevronDown" size={14} />
                  </span>
                </button>

                {/* Bold color active indicator line under the menu element */}
                {isMenuOpen && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full z-40 transition-all duration-200" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Right side user actions */}
        <div className="vg-nav-actions z-30">
          {user ? (
            <div className="vg-account-menu">
              <button
                className="vg-account-trigger"
                type="button"
                aria-label="Tài khoản"
              >
                <Icon name="user" />
                <span>{user.full_name || "Tài khoản"}</span>
              </button>
              <div className="vg-dropdown vg-account-dropdown">
                <Link to="/customer/profile">
                  <Icon name="user" /> Hồ sơ của tôi
                </Link>
                <Link to="/customer/bookings">
                  <Icon name="globe" /> Chuyến đi của tôi
                </Link>
                <Link to="/customer/favorites">
                  <Icon name="heart" /> Tour yêu thích
                </Link>
                {user.role === "admin" ? (
                  <Link className="vg-admin-link" to="/admin">
                    <Icon name="settings" /> Trang quản trị
                  </Link>
                ) : null}
                <button type="button" onClick={onLogout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link className="vg-login-link hover:bg-blue-50/50 rounded-xl" to="/auth/login">
                {language === "vi" ? "Đăng nhập" : "Sign In"}
              </Link>
              <Link className="vg-signup-link bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm" to="/auth/register">
                {language === "vi" ? "Đăng ký" : "Sign Up"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Mega Menu Dropdown Drop-down container */}
      {activeMenu && activeMenuObj && (
        <div
          className="absolute left-0 right-0 w-full bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)] border-t border-gray-100/80 z-20 hidden md:block transition-all duration-300 ease-out transform"
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        >
          <div className="max-w-7xl mx-auto grid grid-cols-[280px_1fr] min-h-[380px]">
            {/* Left Sidebar categories (Regions/tabs) */}
            <div className="border-r border-gray-100 py-6 px-6 bg-gray-50/40">
              <ul className="space-y-1">
                {activeMenuObj.sidebar.map((tab) => {
                  const isActiveTab = activeTab === tab.id;
                  const tabLabel = language === "vi" ? tab.label.vi : tab.label.en;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        className={`w-full flex items-center text-left py-2.5 px-4 rounded-xl text-[0.93rem] transition-all duration-200 ${
                          isActiveTab
                            ? "font-bold text-blue-600 bg-blue-50/50"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                        onMouseEnter={() => setActiveTab(tab.id)}
                      >
                        {isActiveTab && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2.5 shrink-0" />
                        )}
                        <span className={isActiveTab ? "" : "pl-4"}>
                          {tabLabel}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Right content display: 3-column grid for destinations/activities */}
            <div className="p-8 overflow-y-auto max-h-[460px]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                {activeContentItems.map((item, idx) => {
                  const itemTitle = language === "vi" ? item.title.vi : item.title.en;
                  const itemSubtitle = language === "vi" ? item.subtitle.vi : item.subtitle.en;
                  
                  // Construct a search dynamic link query for destinations or experiences
                  const searchUrl = item.slug
                    ? `/tours/${item.slug}`
                    : `/tours?q=${encodeURIComponent(language === "vi" ? item.title.vi : item.title.en)}`;

                  return (
                    <Link
                      key={idx}
                      to={searchUrl}
                      className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-blue-50/30 border border-transparent hover:border-blue-100/10 transition-all duration-200 group"
                    >
                      {/* Avatar shape thumbnail */}
                      <img
                        src={item.image}
                        alt={itemTitle}
                        className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100 shadow-sm"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors truncate">
                          {itemTitle}
                        </h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">
                          {itemSubtitle}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation (Accordion type layout) */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white shadow-2xl border-l border-gray-100 transform transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <BrandLogo />
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600"
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-80px)] p-6 space-y-6">
          <div className="space-y-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `block font-semibold text-lg ${isActive ? "text-blue-600" : "text-gray-900"}`
              }
              onClick={() => setMobileOpen(false)}
            >
              {language === "vi" ? "Trang chủ" : "Home"}
            </NavLink>

            {/* Accordions sections */}
            {Object.keys(menuData).map((menuKey) => {
              const menu = menuData[menuKey];
              const isAccordionOpen = mobileAccordion === menuKey;
              const menuLabel = language === "vi" ? menu.label.vi : menu.label.en;

              return (
                <div key={menuKey} className="border-t border-gray-50 pt-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between font-semibold text-lg text-gray-900 py-2.5 text-left"
                    onClick={() => setMobileAccordion(isAccordionOpen ? null : menuKey)}
                  >
                    <span>{menuLabel}</span>
                    <span className={`transition-transform duration-200 ${isAccordionOpen ? "rotate-180 text-blue-600" : "text-gray-400"}`}>
                      <Icon name="chevronDown" size={18} />
                    </span>
                  </button>

                  {isAccordionOpen && (
                    <div className="mt-2 pl-3 space-y-4 border-l border-gray-100">
                      {menu.sidebar.map((tab) => {
                        const tabLabel = language === "vi" ? tab.label.vi : tab.label.en;
                        const items = menu.content[tab.id] || [];
                        if (items.length === 0) return null;

                        return (
                          <div key={tab.id} className="space-y-2">
                            <h5 className="font-bold text-xs text-blue-500 uppercase tracking-wider">
                              {tabLabel}
                            </h5>
                            <div className="grid grid-cols-1 gap-2.5 pl-1.5">
                              {items.map((item, idx) => {
                                const itemTitle = language === "vi" ? item.title.vi : item.title.en;
                                const searchUrl = item.slug
                                  ? `/tours/${item.slug}`
                                  : `/tours?q=${encodeURIComponent(language === "vi" ? item.title.vi : item.title.en)}`;
                                return (
                                  <Link
                                    key={idx}
                                    to={searchUrl}
                                    className="flex items-center gap-3 py-1 hover:text-blue-600 transition-colors"
                                    onClick={() => setMobileOpen(false)}
                                  >
                                    <img
                                      src={item.image}
                                      alt={itemTitle}
                                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-100"
                                    />
                                    <span className="text-[0.93rem] font-medium text-gray-700">
                                      {itemTitle}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User authenticate trigger links for mobile */}
          <div className="border-t border-gray-100 pt-6">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <Icon name="user" />
                  <span className="font-semibold text-gray-900">{user.full_name || "Tài khoản"}</span>
                </div>
                <Link
                  to="/customer/profile"
                  className="block text-gray-600 font-medium hover:text-blue-600"
                  onClick={() => setMobileOpen(false)}
                >
                  Hồ sơ của tôi
                </Link>
                <Link
                  to="/customer/bookings"
                  className="block text-gray-600 font-medium hover:text-blue-600"
                  onClick={() => setMobileOpen(false)}
                >
                  Chuyến đi của tôi
                </Link>
                <Link
                  to="/customer/favorites"
                  className="block text-gray-600 font-medium hover:text-blue-600"
                  onClick={() => setMobileOpen(false)}
                >
                  Tour yêu thích
                </Link>
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="block text-blue-600 font-semibold hover:underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    Trang quản trị
                  </Link>
                )}
                <button
                  type="button"
                  className="w-full text-left text-red-500 font-semibold pt-2"
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  className="w-full text-center py-3 rounded-xl border border-gray-200 font-semibold text-gray-800 hover:bg-gray-50 transition-all duration-200"
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                >
                  {language === "vi" ? "Đăng nhập" : "Sign In"}
                </Link>
                <Link
                  className="w-full text-center py-3 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 transition-all duration-200 shadow-sm"
                  to="/auth/register"
                  onClick={() => setMobileOpen(false)}
                >
                  {language === "vi" ? "Đăng ký" : "Sign Up"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}

export default Header;
