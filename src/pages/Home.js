import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Select,
  Input,
  Row,
  Col,
  Modal,
  Card,
  Checkbox,
} from "antd";
import "./Home.css";
// import data from "./tmpData";

import { SearchOutlined } from "@ant-design/icons";
import SockJS from "sockjs-client";
const { Option } = Select;
const { Search } = Input;

// Hàm chuyển đổi ký tự có dấu thành không dấu
const removeAccents = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const Home = () => {
  const [data, setData] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]); // Khóa hàng mở rộng
  const [selectedWarehouse, setSelectedWarehouse] = useState("0");
  const [searchTerm, setSearchValue] = useState("");
  const [totalProduct, setTotalProduct] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(0);
  const [rawMaterial, setRawMaterial] = useState(0);
  const [finishedProduct, setFinishedProduct] = useState(0);

  const aggregateData = (items) => {
    // Lọc items dựa trên selectedWarehouse

    setTotalProduct(items.length);
    const filteredItems = items.filter(
      (item) => item.warehouse === selectedWarehouse
    );

    setCurrentProduct(filteredItems.length);

    // Chuẩn hóa searchTerm và lọc thêm dựa trên tên sản phẩm
    const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase());
    const furtherFilteredItems = filteredItems.filter((item) =>
      removeAccents(item.information.split(" - ")[0].toLowerCase()).includes(
        normalizedSearchTerm
      )
    );

    setRawMaterial(
      furtherFilteredItems.filter(
        (item) => item.classification_name === "Nguyên vật liệu"
      ).length
    );

    setFinishedProduct(
      furtherFilteredItems.filter(
        (item) => item.classification_name === "Thành phẩm"
      ).length
    );

    // Gom nhóm dữ liệu theo tên và phân loại
    const grouped = furtherFilteredItems.reduce((acc, item) => {
      const name = item.information.split(" - ")[0]; // Tên sản phẩm
      const category = item.classification_name; // Phân loại
      const key = `${name}-${category}`;

      if (!acc[key]) {
        acc[key] = {
          name,
          category,
          count: 0,
          data: [],
        };
      }
      acc[key].count += 1;
      acc[key].data.push({
        epc: item.epc,
        timestamp: item.timestamp ? item.timestamp : "Chưa từng vào kho",
      });
      return acc;
    }, {});

    // Thêm key cho mỗi object
    return Object.values(grouped).map((item, index) => ({
      ...item,
      key: index + 1,
    }));
  };

  const handleViewHistory = (epc) => {
    // setIsModalOpen(true);
    // setLoading(true);
    // fetch(`http://localhost:3003/api/get-record/${epc}`)
    //   .then((response) => {
    //     if (!response.ok) {
    //       throw new Error("Network response was not ok");
    //     }
    //     return response.json();
    //   })
    //   .then((data) => {
    //     setHistoryData(data);
    //     setLoading(false);
    //     console.log(data);
    //   })
    //   .catch((error) => {
    //     console.error("Error fetching data:", error);
    //     setLoading(false);
    //   });
  };

  useEffect(() => {
    // Gọi API để lấy dữ liệu khi component được mount
    fetch("http://localhost:3003/api/fetch-data")
      .then((response) => response.json())
      .then((data) => {
        // Thêm trường key vào mỗi object trong mảng
        // let newData = data.arrayData.map((item, index) => ({
        //   ...item,
        //   key: index + 1, // Tạo key tự tăng
        // }));

        console.log(data.arrayData);

        const newData = aggregateData(data.arrayData);

        setData(newData);

        console.log(newData);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });

    // Thiết lập kết nối WebSocket
    const sock = new SockJS("https://localhost:8090/echo");
    console.log("sock ", sock);

    sock.onopen = function () {
      console.log("WebSocket connection open");
    };

    sock.onmessage = function (e) {
      const newData = JSON.parse(e.data);
      setData(aggregateData(newData));
    };

    sock.onclose = function () {
      console.log("WebSocket connection closed");
    };

    // Dọn dẹp khi component unmount
    return () => {
      sock.close();
    };
  }, [selectedWarehouse, searchTerm]);

  const columns = [
    { title: "Tên mặt hàng", dataIndex: "name", key: "name" },
    {
      title: "Phân loại",
      dataIndex: "category",
      key: "category",
      align: "center",
    },
    { title: "Số lượng", dataIndex: "count", key: "count", align: "center" },
    // Cấu hình thêm các cột nếu cần
  ];

  // Cấu hình mở rộng để hiển thị thông tin chi tiết
  const expandable = {
    expandedRowRender: (record) => (
      <Table
        columns={[
          { title: "EPC", dataIndex: "epc", key: "epc" },
          {
            title: "Thời gian vào kho",
            dataIndex: "timestamp",
            key: "timestamp",
          },
          {
            title: "Hành động",
            key: "action",
            render: (text, record) => (
              <Button onClick={() => handleViewHistory(record.epc)}>
                Xem lịch sử vận chuyển
              </Button>
            ),
          },
        ]}
        dataSource={record.data}
        pagination={false}
      />
    ),
    expandedRowKeys: expandedRowKeys,
    onExpand: (expanded, record) => {
      const keys = expanded ? [record.key] : [];
      setExpandedRowKeys(keys);
    },
  };

  const rowClassName = (record) => {
    if (record.category === "Nguyên vật liệu") {
      return "row-raw-material hover-bg";
    } else if (record.category === "Thành phẩm") {
      return "row-finished-product hover-bg";
    }
    return "hover-bg";
  };

  return (
    <div>
      <div className="mb-5">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card
              className="border-l-4"
              bodyStyle={{ padding: "20px", backgroundColor: "#f0f4ff" }}
            >
              <h2 className={`text-3xl`}>{totalProduct}</h2>
              <p className="text-lg">Tổng sản phẩm</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card
              className="border-l-4"
              bodyStyle={{ padding: "20px", backgroundColor: "#e0ffef" }}
            >
              <h2 className={`text-3xl`}>{currentProduct}</h2>
              <p className="text-lg">Hiện tại</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card
              className="border-l-4"
              bodyStyle={{ padding: "20px", backgroundColor: "#fff4e6" }}
            >
              <h2 className={`text-3xl`}>{rawMaterial}</h2>
              <p className="text-lg">Nguyên vật liệu</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card
              className="border-l-4"
              bodyStyle={{ padding: "20px", backgroundColor: "#ffe4e6" }}
            >
              <h2 className={`text-3xl`}>{finishedProduct}</h2>
              <p className="text-lg">Thành phẩm</p>
            </Card>
          </Col>
        </Row>
      </div>
      <Row
        gutter={[16, 16]}
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Col>
          <Select
            defaultValue="0"
            placeholder="Chọn Kho"
            onChange={(value) => setSelectedWarehouse(value)}
            style={{ width: 150 }}
          >
            <Option value="0">Ngoài kho</Option>
            <Option value="1">Kho 1</Option>
            <Option value="2">Kho 2</Option>
            <Option value="3">Kho 3</Option>
          </Select>
        </Col>
        <Col>
          <Input
            placeholder="Tìm kiếm"
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 200 }}
          />
        </Col>
      </Row>

      {/* <h1 style={{ fontSize: "30px" }}>{data}</h1> */}

      <Table
        className="bg-white shadow-lg rounded-lg overflow-hidden"
        columns={columns}
        dataSource={data}
        expandable={expandable}
        rowClassName={rowClassName}
      />
    </div>
  );
};

export default Home;
