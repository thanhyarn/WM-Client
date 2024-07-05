import React, { useState, useEffect } from "react";
import { Table, Button, Select, Input, Row, Col } from "antd";
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
  const [searchValue, setSearchValue] = useState("");

  const aggregateData = (items) => {
    const filteredItems = items.filter(
      (item) => item.warehouse === selectedWarehouse
    );
    const grouped = filteredItems.reduce((acc, item) => {
      const name = item.information.split(" - ")[0]; // Tên sản phẩm
      const category = item.classification_name; // Phân loại
      const key = `${name}-${category}`;

      if (!acc[key]) {
        acc[key] = {
          name,
          category,
          count: 0,
          data: [], // Khởi tạo mảng để lưu thông tin chi tiết
        };
      }
      acc[key].count += 1;
      acc[key].data.push({
        epc: item.epc,
        timestamp: item.timestamp, // Thêm thông tin epc và timestamp vào mảng
      });
      return acc;
    }, {});

    // Thêm key cho mỗi object sau khi đã gom nhóm xong
    return Object.values(grouped).map((item, index) => ({
      ...item,
      key: index + 1, // Tạo key bắt đầu từ 1 và tăng dần
    }));
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
    const sock = new SockJS("http://localhost:8090/echo");
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
  }, [selectedWarehouse]);

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

  // const filteredData = data.filter((item) => {
  //   const matchesWarehouse = selectedWarehouse
  //     ? item.warehouse === selectedWarehouse
  //     : true;
  //   const searchValueNoAccents = removeAccents(searchValue.toLowerCase());
  //   const matchesSearch = searchValue
  //     ? removeAccents(item.name.toLowerCase()).includes(searchValueNoAccents) ||
  //       (item.barcode &&
  //         removeAccents(item.barcode.toLowerCase()).includes(
  //           searchValueNoAccents
  //         ))
  //     : true;
  //   return matchesWarehouse && matchesSearch;
  // });
  return (
    <div>
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
      <Table
        className="bg-white shadow-lg rounded-lg overflow-hidden"
        columns={columns}
        dataSource={data}
        expandable={expandable}
        rowClassName={() => "hover:bg-gray-100 p-4"}
      />
    </div>
  );
};

export default Home;
