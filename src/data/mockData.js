// ─── NagarNetra Mock Data ────────────────────────────────────────────────────────
// 30 Active Dump Points + 5 Unmanaged (failed cleanup)
// Total active report_count ≈ 360
// Every point has a report_id in SWC-XXXX or NGN-XXXX format
// ──────────────────────────────────────────────────────────────────────────────

export const DUMP_POINTS = [
  // ── ACTIVE HOTSPOTS (report_count 30+) ──
  { id:"dp_001", community_id:"COM-0001", name:"Chowk Bazaar Illegal Dump",             lat:26.8583, lng:80.9088, report_count:42, first_reported:"2024-08-05", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_002", community_id:"COM-0002", name:"Aminabad Market Waste Pile",            lat:26.8403, lng:80.9219, report_count:35, first_reported:"2024-12-10", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_003", community_id:"COM-0003", name:"Kanpur Road Industrial Waste",          lat:26.8012, lng:80.8823, report_count:28, first_reported:"2024-07-15", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },

  // ── ACTIVE HIGH (report_count 15–29) ──
  { id:"dp_004", community_id:"COM-0004", name:"Charbagh Station Road Waste",           lat:26.8369, lng:80.9186, report_count:24, first_reported:"2024-10-25", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_005", community_id:"COM-0005", name:"Qaiserbagh Bus Stand Rear",             lat:26.8489, lng:80.9267, report_count:22, first_reported:"2024-11-18", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },
  { id:"dp_006", community_id:"COM-0006", name:"Transport Nagar Yard Overflow",         lat:26.8734, lng:80.8712, report_count:20, first_reported:"2025-03-22", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_007", community_id:"COM-0007", name:"Thakurganj Industrial Back",            lat:26.8734, lng:80.9023, report_count:18, first_reported:"2025-04-30", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_008", community_id:"COM-0008", name:"Anora Kala Village Drain Dump",         lat:26.8620, lng:80.9320, report_count:16, first_reported:"2025-07-22", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_009", community_id:"COM-0009", name:"Gomti Nagar Extension Waste Pile",      lat:26.8456, lng:81.0543, report_count:15, first_reported:"2025-04-19", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },

  // ── ACTIVE MEDIUM (report_count 7–14) ──
  { id:"dp_010", community_id:"COM-0010", name:"Hazratganj Market Back Alley",          lat:26.8520, lng:80.9420, report_count:13, first_reported:"2025-08-11", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_011", community_id:"COM-0011", name:"Alambagh Market Waste",                 lat:26.8278, lng:80.8934, report_count:12, first_reported:"2025-04-05", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_012", community_id:"COM-0012", name:"Rajajipuram Market Dump",               lat:26.8556, lng:80.8944, report_count:11, first_reported:"2025-05-14", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_013", community_id:"COM-0013", name:"Munshipulia Flyover Dump",              lat:26.8945, lng:80.9756, report_count:11, first_reported:"2025-07-12", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_014", community_id:"COM-0014", name:"Lalbagh Crossing Dump",                 lat:26.8534, lng:80.9089, report_count:10, first_reported:"2025-06-28", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_015", community_id:"COM-0015", name:"Husainabad Clock Tower Area",           lat:26.8634, lng:80.9098, report_count:10, first_reported:"2025-06-10", last_reported:"2026-07-06", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },
  { id:"dp_016", community_id:"COM-0016", name:"Indira Nagar Sector 9 Back Alley",     lat:26.8812, lng:80.9943, report_count:9,  first_reported:"2025-11-03", last_reported:"2026-07-04", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_017", community_id:"COM-0017", name:"Telibagh Drain Side Dump",              lat:26.7923, lng:80.9678, report_count:9,  first_reported:"2025-08-27", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_018", community_id:"COM-0018", name:"Gurcharan Lal Road (Near STP)",         lat:26.8150, lng:80.9450, report_count:8,  first_reported:"2025-10-15", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_019", community_id:"COM-0019", name:"Hardoi Road Boundary Dump",             lat:26.9156, lng:80.8734, report_count:8,  first_reported:"2025-05-30", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_020", community_id:"COM-0020", name:"Aliganj Main Road Overspill",           lat:26.8834, lng:80.9516, report_count:7,  first_reported:"2025-09-22", last_reported:"2026-07-05", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },

  // ── ACTIVE LOW (report_count 3–6) ──
  { id:"dp_021", community_id:"COM-0021", name:"Lakdi Mohalla Petrol Pump Dump",        lat:26.8320, lng:80.9250, report_count:6,  first_reported:"2026-02-14", last_reported:"2026-07-02", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_022", community_id:"COM-0022", name:"Jankipuram Sector C Dump",              lat:26.9012, lng:80.9812, report_count:6,  first_reported:"2025-11-18", last_reported:"2026-07-04", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_023", community_id:"COM-0023", name:"Kursi Road Roadside Pile",              lat:26.8956, lng:81.0234, report_count:5,  first_reported:"2026-02-07", last_reported:"2026-06-29", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },
  { id:"dp_024", community_id:"COM-0024", name:"Sitapur Road Overpass Dump",            lat:26.9234, lng:80.9012, report_count:5,  first_reported:"2025-10-01", last_reported:"2026-07-02", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_025", community_id:"COM-0025", name:"Gomti Nagar Phase 1 Drain",             lat:26.8512, lng:80.9934, report_count:5,  first_reported:"2025-09-14", last_reported:"2026-07-03", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },
  { id:"dp_026", community_id:"COM-0026", name:"Dubagga Highway Edge",                  lat:26.8650, lng:80.8520, report_count:4,  first_reported:"2026-04-10", last_reported:"2026-06-30", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },
  { id:"dp_027", community_id:"COM-0027", name:"Nirala Nagar Park Overspill",           lat:26.8789, lng:80.9876, report_count:4,  first_reported:"2026-01-05", last_reported:"2026-07-02", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },
  { id:"dp_028", community_id:"COM-0028", name:"SGPGI Campus Rear Wall",                lat:26.7934, lng:80.9345, report_count:3,  first_reported:"2026-05-20", last_reported:"2026-06-25", photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"], status:"active" },
  { id:"dp_029", community_id:"COM-0029", name:"Sultanpur Road Drain Dump",             lat:26.7712, lng:81.0123, report_count:3,  first_reported:"2026-01-30", last_reported:"2026-07-01", photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"], status:"active" },
  { id:"dp_030", community_id:"COM-0030", name:"Kapoorthala Colony Dump",               lat:26.8645, lng:80.9701, report_count:3,  first_reported:"2026-03-11", last_reported:"2026-06-28", photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"], status:"active" },

  // ── UNMANAGED (resolved but feedback < 60% satisfactory) ──
  {
    id:"dp_um1", community_id:"COM-0031", name:"Ghaila Legacy Landfill",
    lat:26.9038, lng:80.8988, report_count:19,
    first_reported:"2023-11-20", last_reported:"2026-07-01",
    photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-07-01",
    unmanaged_reason:"Low satisfaction (38%)",
    satisfaction_pct: 38,
  },
  {
    id:"dp_um2", community_id:"COM-0032", name:"Alambagh Bus Depot Rear",
    lat:26.8108, lng:80.9132, report_count:14,
    first_reported:"2025-07-30", last_reported:"2026-06-28",
    photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-06-28",
    unmanaged_reason:"Low satisfaction (42%)",
    satisfaction_pct: 42,
  },
  {
    id:"dp_um3", community_id:"COM-0033", name:"Mahanagar Extension Waste",
    lat:26.8712, lng:80.9608, report_count:9,
    first_reported:"2025-12-20", last_reported:"2026-06-30",
    photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-06-30",
    unmanaged_reason:"Low satisfaction (50%)",
    satisfaction_pct: 50,
  },
  {
    id:"dp_um4", community_id:"COM-0034", name:"Raibareli Road Illegal Tip",
    lat:26.7823, lng:80.9934, report_count:11,
    first_reported:"2025-07-08", last_reported:"2026-07-02",
    photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-07-02",
    unmanaged_reason:"Low satisfaction (33%)",
    satisfaction_pct: 33,
  },
  {
    id:"dp_um5", community_id:"COM-0035", name:"Babuganj Market Overspill",
    lat:26.8623, lng:80.9223, report_count:8,
    first_reported:"2025-10-17", last_reported:"2026-07-03",
    photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-07-03",
    unmanaged_reason:"Low satisfaction (45%)",
    satisfaction_pct: 45,
  },
  {
    id:"dp_um6", community_id:"COM-0036", name:"Gomti Nagar Riverfront Garbage Bank",
    lat:26.8530, lng:80.9780, report_count:21,
    first_reported:"2025-09-10", last_reported:"2026-07-04",
    photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-07-04",
    unmanaged_reason:"Incomplete cleanup — 1-star rating with proof photo",
    satisfaction_pct: 20,
  },
  {
    id:"dp_um7", community_id:"COM-0037", name:"Indira Nagar Sector 14 Construction Debris",
    lat:26.8870, lng:80.9980, report_count:17,
    first_reported:"2025-11-05", last_reported:"2026-07-05",
    photos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"],
    status:"unmanaged",
    resolved_at:"2026-07-05",
    unmanaged_reason:"Low satisfaction (30%) — Waste re-accumulated within 24h",
    satisfaction_pct: 30,
  },

  // ── RESOLVED DEMO CASES ──
  {
    id:"dp_res1", community_id:"COM-0038", name:"Hazratganj Main Plaza Clean Zone",
    lat:26.8510, lng:80.9400, report_count:14,
    first_reported:"2025-06-10", last_reported:"2026-07-05",
    photos:["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80"],
    status:"resolved",
    resolved_at:"2026-07-05",
    unmanaged_reason: null,
    satisfaction_pct: 95,
  },
  {
    id:"dp_res2", community_id:"COM-0039", name:"Alambagh Metro Station Cleaned Spot",
    lat:26.8250, lng:80.8910, report_count:12,
    first_reported:"2025-08-15", last_reported:"2026-07-06",
    photos:["https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80"],
    status:"resolved",
    resolved_at:"2026-07-06",
    unmanaged_reason: null,
    satisfaction_pct: 92,
  },
];

// ─── Raw Reports (40 entries) ──────────────────────────────────────────────────
export const RAW_REPORTS = [
  { id:"rr_001", report_id:"NGN-0001", phone_number:"+91 98xxxxxx12", timestamp:"2026-07-06T09:41:00+05:30", matched_point_id:"dp_001", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Chowk Bazaar Illegal Dump" },
  { id:"rr_002", report_id:"NGN-0002", phone_number:"+91 70xxxxxx55", timestamp:"2026-07-06T08:17:00+05:30", matched_point_id:"dp_002", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Aminabad Market Waste Pile" },
  { id:"rr_003", report_id:"NGN-0003", phone_number:"+91 91xxxxxx88", timestamp:"2026-07-06T07:03:00+05:30", matched_point_id:null,     classification:"new_point", photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:null },
  { id:"rr_004", report_id:"NGN-0004", phone_number:"+91 63xxxxxx30", timestamp:"2026-07-05T21:54:00+05:30", matched_point_id:null,     classification:"rejected",  reject_reason:"Blurry image", photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:null },
  { id:"rr_005", report_id:"NGN-0005", phone_number:"+91 89xxxxxx41", timestamp:"2026-07-05T18:30:00+05:30", matched_point_id:"dp_001", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Chowk Bazaar Illegal Dump" },
  { id:"rr_006", report_id:"NGN-0006", phone_number:"+91 77xxxxxx09", timestamp:"2026-07-05T15:11:00+05:30", matched_point_id:"dp_004", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Charbagh Station Road Waste" },
  { id:"rr_007", report_id:"NGN-0007", phone_number:"+91 82xxxxxx66", timestamp:"2026-07-05T11:48:00+05:30", matched_point_id:null,     classification:"rejected",  reject_reason:"Duplicate report", photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:null },
  { id:"rr_008", report_id:"NGN-0008", phone_number:"+91 94xxxxxx27", timestamp:"2026-07-05T09:22:00+05:30", matched_point_id:"dp_003", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Kanpur Road Industrial Waste" },
  { id:"rr_009", report_id:"NGN-0009", phone_number:"+91 73xxxxxx51", timestamp:"2026-07-04T20:05:00+05:30", matched_point_id:null,     classification:"new_point", photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:null },
  { id:"rr_010", report_id:"NGN-0010", phone_number:"+91 99xxxxxx03", timestamp:"2026-07-04T16:33:00+05:30", matched_point_id:"dp_003", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Kanpur Road Industrial Waste" },
  { id:"rr_011", report_id:"NGN-0011", phone_number:"+91 85xxxxxx74", timestamp:"2026-07-04T12:19:00+05:30", matched_point_id:"dp_006", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Transport Nagar Yard Overflow" },
  { id:"rr_012", report_id:"NGN-0012", phone_number:"+91 96xxxxxx18", timestamp:"2026-07-03T17:44:00+05:30", matched_point_id:null,     classification:"rejected",  reject_reason:"No GPS metadata", photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:null },
  { id:"rr_013", report_id:"NGN-0013", phone_number:"+91 75xxxxxx90", timestamp:"2026-07-03T10:08:00+05:30", matched_point_id:"dp_002", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Aminabad Market Waste Pile" },
  { id:"rr_014", report_id:"NGN-0014", phone_number:"+91 88xxxxxx36", timestamp:"2026-07-02T14:25:00+05:30", matched_point_id:"dp_007", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Thakurganj Industrial Back" },
  { id:"rr_015", report_id:"NGN-0015", phone_number:"+91 62xxxxxx47", timestamp:"2026-07-01T09:55:00+05:30", matched_point_id:null,     classification:"new_point", photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:null },
  { id:"rr_016", report_id:"NGN-0016", phone_number:"+91 93xxxxxx21", timestamp:"2026-07-06T06:44:00+05:30", matched_point_id:"dp_005", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Qaiserbagh Bus Stand Rear" },
  { id:"rr_017", report_id:"NGN-0017", phone_number:"+91 76xxxxxx83", timestamp:"2026-07-05T22:30:00+05:30", matched_point_id:null,     classification:"rejected",  reject_reason:"Out of boundary", photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:null },
  { id:"rr_018", report_id:"NGN-0018", phone_number:"+91 81xxxxxx59", timestamp:"2026-07-05T14:00:00+05:30", matched_point_id:"dp_009", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Chinhat Industrial Zone" },
  { id:"rr_019", report_id:"NGN-0019", phone_number:"+91 67xxxxxx14", timestamp:"2026-07-04T08:50:00+05:30", matched_point_id:"dp_019", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Hardoi Road Boundary Dump" },
  { id:"rr_020", report_id:"NGN-0020", phone_number:"+91 90xxxxxx77", timestamp:"2026-07-03T19:15:00+05:30", matched_point_id:null,     classification:"new_point", photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:null },
  { id:"rr_021", report_id:"NGN-0021", phone_number:"+91 72xxxxxx33", timestamp:"2026-07-06T05:30:00+05:30", matched_point_id:"dp_001", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Chowk Bazaar Illegal Dump" },
  { id:"rr_022", report_id:"NGN-0022", phone_number:"+91 84xxxxxx61", timestamp:"2026-07-06T04:20:00+05:30", matched_point_id:"dp_004", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Charbagh Station Road Waste" },
  { id:"rr_023", report_id:"NGN-0023", phone_number:"+91 65xxxxxx49", timestamp:"2026-07-05T20:10:00+05:30", matched_point_id:"dp_008", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Anora Kala Village Drain Dump" },
  { id:"rr_024", report_id:"NGN-0024", phone_number:"+91 97xxxxxx25", timestamp:"2026-07-05T17:05:00+05:30", matched_point_id:"dp_010", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Hazratganj Market Back Alley" },
  { id:"rr_025", report_id:"NGN-0025", phone_number:"+91 68xxxxxx52", timestamp:"2026-07-05T12:40:00+05:30", matched_point_id:"dp_002", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Aminabad Market Waste Pile" },
  { id:"rr_026", report_id:"NGN-0026", phone_number:"+91 79xxxxxx38", timestamp:"2026-07-04T22:15:00+05:30", matched_point_id:"dp_011", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Alambagh Market Waste" },
  { id:"rr_027", report_id:"NGN-0027", phone_number:"+91 83xxxxxx17", timestamp:"2026-07-04T19:00:00+05:30", matched_point_id:null,     classification:"rejected",  reject_reason:"Blurry image", photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:null },
  { id:"rr_028", report_id:"NGN-0028", phone_number:"+91 71xxxxxx86", timestamp:"2026-07-04T15:30:00+05:30", matched_point_id:"dp_005", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Qaiserbagh Bus Stand Rear" },
  { id:"rr_029", report_id:"NGN-0029", phone_number:"+91 92xxxxxx44", timestamp:"2026-07-04T11:00:00+05:30", matched_point_id:"dp_012", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Rajajipuram Market Dump" },
  { id:"rr_030", report_id:"NGN-0030", phone_number:"+91 66xxxxxx70", timestamp:"2026-07-03T23:45:00+05:30", matched_point_id:"dp_003", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Kanpur Road Industrial Waste" },
  { id:"rr_031", report_id:"NGN-0031", phone_number:"+91 87xxxxxx29", timestamp:"2026-07-03T14:20:00+05:30", matched_point_id:"dp_006", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Transport Nagar Yard Overflow" },
  { id:"rr_032", report_id:"NGN-0032", phone_number:"+91 74xxxxxx63", timestamp:"2026-07-03T09:50:00+05:30", matched_point_id:"dp_015", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Husainabad Clock Tower Area" },
  { id:"rr_033", report_id:"NGN-0033", phone_number:"+91 95xxxxxx08", timestamp:"2026-07-02T21:30:00+05:30", matched_point_id:"dp_013", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Munshipulia Flyover Dump" },
  { id:"rr_034", report_id:"NGN-0034", phone_number:"+91 61xxxxxx91", timestamp:"2026-07-02T16:10:00+05:30", matched_point_id:null,     classification:"rejected",  reject_reason:"No photo attached", photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:null },
  { id:"rr_035", report_id:"NGN-0035", phone_number:"+91 80xxxxxx57", timestamp:"2026-07-02T11:45:00+05:30", matched_point_id:"dp_007", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Thakurganj Industrial Back" },
  { id:"rr_036", report_id:"NGN-0036", phone_number:"+91 69xxxxxx42", timestamp:"2026-07-01T20:00:00+05:30", matched_point_id:"dp_016", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Indira Nagar Sector 9 Back Alley" },
  { id:"rr_037", report_id:"NGN-0037", phone_number:"+91 86xxxxxx15", timestamp:"2026-07-01T15:30:00+05:30", matched_point_id:"dp_014", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Lalbagh Crossing Dump" },
  { id:"rr_038", report_id:"NGN-0038", phone_number:"+91 78xxxxxx80", timestamp:"2026-07-01T10:15:00+05:30", matched_point_id:"dp_020", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=120&q=80", matched_point_name:"Aliganj Main Road Overspill" },
  { id:"rr_039", report_id:"NGN-0039", phone_number:"+91 64xxxxxx06", timestamp:"2026-06-30T18:40:00+05:30", matched_point_id:"dp_018", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=120&q=80", matched_point_name:"Gurcharan Lal Road (Near STP)" },
  { id:"rr_040", report_id:"NGN-0040", phone_number:"+91 93xxxxxx72", timestamp:"2026-06-30T12:00:00+05:30", matched_point_id:"dp_017", classification:"matched",  photo_url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", matched_point_name:"Telibagh Drain Side Dump" },
];

// ─── Derived STATS ────────────────────────────────────────────────────────────
const TODAY = "2026-07-06";

export const STATS = {
  activePoints:   DUMP_POINTS.filter(d => d.status === "active").length,
  unmanagedPoints: DUMP_POINTS.filter(d => d.status === "unmanaged").length,
  newToday:       DUMP_POINTS.filter(d => d.last_reported === TODAY).length,
  reportsThisWeek: RAW_REPORTS.filter(r => new Date(r.timestamp) >= new Date("2026-06-30T00:00:00+05:30")).length,
  avgDaysActive:  Math.round(
    DUMP_POINTS.filter(d => d.status === "active").reduce((sum, d) => {
      const days = (new Date(d.last_reported) - new Date(d.first_reported)) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / DUMP_POINTS.filter(d => d.status === "active").length
  ),
  totalReports: DUMP_POINTS.filter(d => d.status === "active").reduce((s, d) => s + d.report_count, 0),
  criticalZones: DUMP_POINTS.filter(d => d.status === "active" && d.report_count >= 7).length,
  matchRate: Math.round((RAW_REPORTS.filter(r => r.classification === "matched").length / RAW_REPORTS.length) * 100),
};

// ─── TEAMS ──────────────────────────────────────────────────────────────────
export const TEAMS = [
  { id: "team_alpha", name: "Rapid Response Unit A", color: "#3b82f6" },
  { id: "team_beta",  name: "North District Sweepers", color: "#8b5cf6" },
  { id: "team_gamma", name: "Gomti Eco Force", color: "#ec4899" },
  { id: "team_delta", name: "Central Heavy Lifters", color: "#eab308" },
  { id: "unassigned", name: "Unassigned", color: "#6b7280" },
];

// ─── MOCK FEEDBACKS ──────────────────────────────────────────────────────────
export const MOCK_FEEDBACKS = [
  { id: "fb_001", report_id: "NGN-0001", point_id: "dp_001", rating: 5, proofUrl: null, timestamp: "2026-07-06T10:15:00+05:30", phone_number: "+91 90xxxxxx77" },
  { id: "fb_002", report_id: "NGN-0004", point_id: "dp_004", rating: 4, proofUrl: null, timestamp: "2026-07-06T09:30:00+05:30", phone_number: "+91 84xxxxxx61" },
  { id: "fb_003", report_id: "NGN-0031", point_id: "dp_um1", rating: 1, proofUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80", timestamp: "2026-07-05T14:20:00+05:30", phone_number: "+91 72xxxxxx33" },
  { id: "fb_004", report_id: "NGN-0032", point_id: "dp_um2", rating: 2, proofUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", timestamp: "2026-07-04T16:45:00+05:30", phone_number: "+91 93xxxxxx21" },
  { id: "fb_005", report_id: "NGN-0010", point_id: "dp_010", rating: 5, proofUrl: null, timestamp: "2026-07-06T11:00:00+05:30", phone_number: "+91 97xxxxxx25" },
  { id: "fb_006", report_id: "NGN-0036", point_id: "dp_um6", rating: 1, proofUrl: "https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=400&q=80", timestamp: "2026-07-04T18:10:00+05:30", phone_number: "+91 81xxxxxx59" },
  { id: "fb_007", report_id: "NGN-0038", point_id: "dp_res1", rating: 5, proofUrl: null, timestamp: "2026-07-05T19:00:00+05:30", phone_number: "+91 88xxxxxx36" },
  { id: "fb_008", report_id: "NGN-0039", point_id: "dp_res2", rating: 5, proofUrl: null, timestamp: "2026-07-06T12:30:00+05:30", phone_number: "+91 75xxxxxx90" },
];
