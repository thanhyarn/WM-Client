import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Table, Row, Col, Select, Input } from "antd";
import "./Home.css";
import Modal from "../components/Modal";
import { useLocation } from "react-router-dom";
const { Option } = Select;

const Tables = () => {
  const [data, setData] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(
    localStorage.getItem("warehouse") || "0"
  );
  const [searchValue, setSearchValue] = useState(
    localStorage.getItem("searchEpc") || ""
  );
  const [totalProduct, setTotalProduct] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(0);
  const [rawMaterial, setRawMaterial] = useState(0);
  const [finishedProduct, setFinishedProduct] = useState(0);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  console.log(searchParams);

  const handleRowClick = async (record) => {
    console.log(record.epc);
    fetch(`http://localhost:3003/api/get-record/${record.epc}`)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        // Tạo nội dung cho Modal
        const items = data.map((item) => {
          const formattedTimestamp = new Date(item.timestamp).toLocaleString();
          const message =
            item.warehouse === "0"
              ? `Đã ra khỏi kho vào ${formattedTimestamp}`
              : `Đã vào kho vào ${formattedTimestamp}`;
          return (
            <div
              key={item.id}
              style={{ padding: "10px", borderBottom: "1px solid #ccc" }}
            >
              <p style={{ fontSize: "20px" }}>{message}</p>
            </div>
          );
        });
        setModalContent(<div>{items}</div>);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setModalContent("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.");
      });

    setIsModalVisible(true);
  };

  // Hàm để loại bỏ dấu tiếng Việt
  const removeVietnameseTones = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D"); // Thay đổi đ/Đ
  };

  // Hàm lọc dữ liệu dựa vào giá trị tìm kiếm
  // Hàm lọc dữ liệu dựa vào giá trị tìm kiếm và kho được chọn
  const getFilteredData = () => {
    const searchNormalized = removeVietnameseTones(searchValue.toLowerCase());

    return data.filter(
      (item) =>
        (removeVietnameseTones(item.information.toLowerCase()).includes(
          searchNormalized
        ) ||
          removeVietnameseTones(item.epc.toLowerCase()).includes(
            searchNormalized
          ) ||
          removeVietnameseTones(
            item.classification_name.toLowerCase()
          ).includes(searchNormalized)) &&
        item.warehouse === selectedWarehouse
    );
  };

  useEffect(() => {
    // Gọi API để lấy dữ liệu khi component được mount
    fetch("http://localhost:3003/api/fetch-data")
      .then((response) => response.json())
      .then((data) => {
        console.log(data.arrayData);

        setData(data.arrayData);
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
      // setData(aggregateData(newData));
    };

    sock.onclose = function () {
      console.log("WebSocket connection closed");
    };

    // Dọn dẹp khi component unmount
    return () => {
      sock.close();
    };
  }, []);

  const columns = [
    {
      title: "EPC",
      dataIndex: "epc",
      key: "epc",
    },
    {
      title: "Information",
      dataIndex: "information",
      key: "information",
    },
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (text) =>
        text ? new Date(text).toLocaleString() : "Chưa vào kho",
    },
    {
      title: "Classification Name",
      dataIndex: "classification_name",
      key: "classification_name",
    },
  ];

  const rowClassName = (record) => {
    if (record.classification_name === "Nguyên vật liệu") {
      return "row-raw-material hover-bg";
    } else if (record.classification_name === "Thành phẩm") {
      return "row-finished-product hover-bg";
    }
    return "hover-bg";
  };

  return (
    <>
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
            value={searchValue}
          />
        </Col>
      </Row>

      <Table
        dataSource={getFilteredData()}
        columns={columns}
        rowKey="epc"
        pagination={{ pageSize: 10 }}
        rowClassName={rowClassName}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
        })}
      />
      {isModalVisible && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setIsModalVisible(false)}>
              &times;
            </span>
            {modalContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Tables;
